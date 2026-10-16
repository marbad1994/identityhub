#!/usr/bin/env bash
# Deploy (or update) Identity Hub on the Contabo host, next to SocialPostAPI
# and Makketing. Safe to run again: every step checks before it changes.
#
#   bash /opt/identityhub/scripts/deploy-server.sh [hub origin]
#
# 1. Turns on SocialPostAPI's callback forwarding (IDENTITY_HUB_URL) and
#    recreates its containers so they read it.
# 2. Fills /opt/identityhub/.env from SocialPostAPI's .env, pulls the image
#    and starts the hub, then waits for its health check.
# 3. Adds the hub's hostname to Makketing's Caddyfile and reloads Caddy.
# 4. Checks DNS and the public health endpoints.
set -euo pipefail

HUB_ORIGIN="${1:-https://identity.makketing.com}"
HUB_HOST="${HUB_ORIGIN#https://}"
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
if grep -q 'IDENTITY_HUB_STATE_PREFIX' "$SPA_DIR/app/api/v1/connect.py" 2>/dev/null; then
  # Recreate only what reads .env; replica counts come from .env too.
  (cd "$SPA_DIR" && docker compose up -d --no-build api worker)
else
  warn "This SocialPostAPI checkout predates callback forwarding. Wait for its GitHub deploy to finish, then run this script again."
fi

# --- Identity Hub -------------------------------------------------------------
log "Identity Hub at $HUB_DIR"
cd "$HUB_DIR"
git pull --ff-only
bash scripts/env-from-socialpostapi.sh "$SPA_DIR/.env" "$HUB_DIR/.env" "$HUB_ORIGIN"
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

# --- Checks ---------------------------------------------------------------------
log "Checks"
SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
DNS_IP="$(getent ahostsv4 "$HUB_HOST" | awk 'NR==1{print $1}' || true)"
if [ "$DNS_IP" = "$SERVER_IP" ]; then
  echo "DNS: $HUB_HOST -> $DNS_IP (this server)"
else
  warn "DNS: $HUB_HOST resolves to '${DNS_IP:-nothing}', expected $SERVER_IP. Add an A record, then Caddy fetches the certificate by itself."
fi
echo "Local:  $(curl -fsS http://127.0.0.1:8316/api/health)"
echo "Public: $(curl -fsS --max-time 15 "$HUB_ORIGIN/api/health" 2>/dev/null || echo 'not reachable yet (DNS or certificate pending)')"
echo
echo "Next: sign in at $HUB_ORIGIN/login, open Apps, register SocialPostAPI and copy its secret."
