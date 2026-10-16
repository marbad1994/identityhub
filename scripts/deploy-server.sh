#!/usr/bin/env bash
# Deploy (or update) Identity Hub on the Contabo host, next to SocialPostAPI
# and Makketing. Safe to run again: every step checks before it changes.
#
#   bash /opt/identityhub/scripts/deploy-server.sh [hub origin]
#
# No DNS record yet? Use a name that sslip.io resolves to the server's IP,
# e.g. https://identityhub.84-247-181-21.sslip.io, and re-run with the real
# domain once its A record exists. Changing the address signs everyone out
# and changes the widget snippet's script URL; accounts and apps are kept.
#
# 1. Turns on SocialPostAPI's callback forwarding (IDENTITY_HUB_URL), applies
#    the targeted upstream patch if needed, and rebuilds/recreates its API.
#    Existing server edits and the checked-out commit are preserved.
# 2. Fills /opt/identityhub/.env from SocialPostAPI's .env, pulls the image
#    and starts the hub, then waits for its health check.
# 3. Adds the hub's hostname to Makketing's Caddyfile and reloads Caddy.
# 4. Checks DNS and the public health endpoints.
set -euo pipefail

HUB_ORIGIN="${1:-https://identityhub.makketing.com}"
HUB_ORIGIN="${HUB_ORIGIN%/}"
if ! [[ "$HUB_ORIGIN" =~ ^https?://[^/?#@[:space:]]+$ ]]; then
  echo "Expected a public origin, e.g. http://84.247.181.21:8316 or https://identityhub.makketing.com" >&2
  exit 1
fi
HUB_HOST="${HUB_ORIGIN#*://}"
HUB_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() { printf '\n==> %s\n' "$*"; }
warn() { printf '!!  %s\n' "$*" >&2; }

# --- SocialPostAPI ----------------------------------------------------------
SPA_DIR=""
for dir in /opt/SocialPostAPI /opt/socialpostapi /opt/SocialPostAPI.git; do
  [ -f "$dir/.env" ] && SPA_DIR="$dir" && break
done
[ -n "$SPA_DIR" ] || { warn "SocialPostAPI's .env not found under /opt. Set it up first."; exit 1; }
log "SocialPostAPI at $SPA_DIR: forwarding hub sign-ins to $HUB_ORIGIN"
if grep -q '^IDENTITY_HUB_URL=' "$SPA_DIR/.env"; then
  sed -i "s|^IDENTITY_HUB_URL=.*|IDENTITY_HUB_URL=$HUB_ORIGIN|" "$SPA_DIR/.env"
else
  printf '\nIDENTITY_HUB_URL=%s\n' "$HUB_ORIGIN" >>"$SPA_DIR/.env"
fi
bash "$HUB_DIR/scripts/patch-socialpostapi-forwarding.sh" "$SPA_DIR"
if ! (cd "$SPA_DIR" && docker compose exec -T --index 1 api python -c \
  'from app.api.v1.connect import _identity_hub_forward' >/dev/null 2>&1); then
  log "Rebuilding SocialPostAPI's API image with callback forwarding"
  (cd "$SPA_DIR" && docker compose build api)
fi
# Validate the image and its configuration before replacing the running API.
(cd "$SPA_DIR" && docker compose run --rm --no-deps api python -c \
  'import os; from app.api.v1.connect import _identity_hub_forward, settings; assert settings.IDENTITY_HUB_URL == os.environ["IDENTITY_HUB_URL"], "Forwarding URL was not loaded"')
(cd "$SPA_DIR" && docker compose up -d --no-build --no-deps --force-recreate api)

# --- Identity Hub -------------------------------------------------------------
log "Identity Hub at $HUB_DIR"
cd "$HUB_DIR"
git pull --ff-only
bash scripts/env-from-socialpostapi.sh "$SPA_DIR/.env" "$HUB_DIR/.env" "$HUB_ORIGIN"
# The address given to this script always wins, so moving the hub to another
# hostname (e.g. from a temporary sslip.io name to the real domain) is a re-run.
sed -i "s|^APP_ORIGIN=.*|APP_ORIGIN=$HUB_ORIGIN|" "$HUB_DIR/.env"
if grep -q '^SMTP_HOST=$' .env || ! grep -q '^SMTP_HOST=' .env; then
  warn "SMTP_HOST is empty: email and password sign-in stays hidden until it is set in $HUB_DIR/.env."
fi
docker compose pull
docker compose up -d
printf 'Waiting for the hub'
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8316/api/health >/dev/null 2>&1; then
    printf ' ready\n'
    break
  fi
  printf '.'
  sleep 2
done
curl -fsS http://127.0.0.1:8316/api/health >/dev/null || { warn "The hub did not become healthy. See: docker compose -f $HUB_DIR/docker-compose.yml logs app"; exit 1; }

# --- Caddy (Makketing's reverse proxy owns 80/443) -------------------------------
if [[ "$HUB_ORIGIN" == https://* ]]; then
  CADDYFILE="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' makketing-caddy 2>/dev/null || true)"
  if [ -z "$CADDYFILE" ]; then
    warn "Container makketing-caddy not found: add this to your reverse proxy by hand:"
    printf '%s {\n\treverse_proxy host.docker.internal:8316\n}\n' "$HUB_HOST"
  else
    if grep -q "^$HUB_HOST" "$CADDYFILE"; then
      log "Caddy already routes $HUB_HOST"
    else
      log "Adding $HUB_HOST to $CADDYFILE"
      cp "$CADDYFILE" "$CADDYFILE.bak.$(date +%s)"
      printf '\n# Identity Hub (separate compose project, /opt/identityhub)\n%s {\n\treverse_proxy host.docker.internal:8316\n}\n' "$HUB_HOST" >>"$CADDYFILE"
    fi
    docker exec makketing-caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null
    docker exec makketing-caddy caddy reload --config /etc/caddy/Caddyfile
  fi
else
  log "Using the direct HTTP address $HUB_ORIGIN; no DNS or Caddy route needed"
fi

# --- Checks ---------------------------------------------------------------------
log "Checks"
docker compose exec -T app node scripts/check-callback-forwarding.mjs
if [[ "$HUB_ORIGIN" == https://* ]]; then
  SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  DNS_IP="$(getent ahostsv4 "$HUB_HOST" | awk 'NR==1{print $1}' || true)"
  if [ "$DNS_IP" = "$SERVER_IP" ]; then
    echo "DNS: $HUB_HOST -> $DNS_IP (this server)"
  else
    warn "DNS: $HUB_HOST resolves to '${DNS_IP:-nothing}', expected $SERVER_IP. Add an A record, then Caddy fetches the certificate by itself."
  fi
fi
echo "Local:  $(curl -fsS http://127.0.0.1:8316/api/health)"
echo "Public: $(curl -fsS --max-time 15 "$HUB_ORIGIN/api/health" 2>/dev/null || echo 'not reachable yet (DNS or certificate pending)')"
echo
echo "Next: sign in at $HUB_ORIGIN/login, open Apps, register SocialPostAPI and copy its secret."
