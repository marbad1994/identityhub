#!/usr/bin/env bash
# Fill Identity Hub's .env from SocialPostAPI's on the same server.
#
#   bash scripts/env-from-socialpostapi.sh [socialpostapi .env] [identityhub .env] [app origin]
#
# Copies the platform client ids and secrets and the SMTP settings (same
# variable names in both apps), generates POSTGRES_PASSWORD and TOKEN_ENCRYPTION_KEY when they are
# not set yet, and never overwrites a value that is already set: changing
# TOKEN_ENCRYPTION_KEY would make every stored platform token unreadable.
# Prints variable names only, never values.
set -euo pipefail

SOURCE="${1:-/opt/socialpostapi/.env}"
TARGET="${2:-/opt/identityhub/.env}"
ORIGIN="${3:-https://identity.makketing.com}"

[ -f "$SOURCE" ] || { echo "No SocialPostAPI env file at $SOURCE" >&2; exit 1; }
touch "$TARGET"
chmod 600 "$TARGET"

# Value of KEY in FILE, without surrounding quotes; empty when absent.
get() {
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$2" | tail -n 1 | sed -E "s/^[^=]*=//; s/^[\"']//; s/[\"'][[:space:]]*\$//" || true
}

# Set KEY=VALUE in TARGET unless it already has a non-empty value.
put() {
  local key="$1" value="$2"
  if [ -n "$(get "$key" "$TARGET")" ]; then
    echo "kept     $key"
    return
  fi
  if [ -z "$value" ]; then
    echo "missing  $key"
    return
  fi
  grep -v -E "^[[:space:]]*$key=" "$TARGET" > "$TARGET.tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$TARGET.tmp"
  mv "$TARGET.tmp" "$TARGET"
  chmod 600 "$TARGET"
  echo "set      $key"
}

put POSTGRES_PASSWORD "$(openssl rand -hex 24)"
put TOKEN_ENCRYPTION_KEY "$(openssl rand -hex 32)"
put APP_ORIGIN "$ORIGIN"
put IDENTITYHUB_BIND "0.0.0.0"

for prefix in TWITTER INSTAGRAM FACEBOOK TIKTOK LINKEDIN YOUTUBE REDDIT SNAPCHAT; do
  put "${prefix}_CLIENT_ID" "$(get "${prefix}_CLIENT_ID" "$SOURCE")"
  put "${prefix}_CLIENT_SECRET" "$(get "${prefix}_CLIENT_SECRET" "$SOURCE")"
done

# Outgoing email for sign-up, password reset and security notices.
for key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_USE_TLS; do
  put "$key" "$(get "$key" "$SOURCE")"
done
put SMTP_FROM_EMAIL "$(get SMTP_FROM_EMAIL "$SOURCE")"

# SocialPostAPI hardcodes its Facebook Login for Business configuration in
# app/platforms/facebook/config.py; the hub reads it from the environment.
fb_config="$(get FACEBOOK_LOGIN_CONFIG_ID "$SOURCE")"
put FACEBOOK_LOGIN_CONFIG_ID "${fb_config:-4572491769705504}"

echo
echo "Wrote $TARGET. 'missing' lines need a value by hand (Snapchat needs its own Snap Kit app)."
echo "SMTP_FROM_EMAIL is copied from SocialPostAPI; change it if the hub should send from another address."
