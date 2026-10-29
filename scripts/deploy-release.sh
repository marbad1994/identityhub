#!/usr/bin/env bash
# Rebuild a pinned, tested commit without changing credentials or restarting Postgres.
# Usage: bash scripts/deploy-release.sh <commit> [/opt/identityhub] [public origin]
set -euo pipefail

RELEASE="${1:?Pass the tested commit SHA}"
HUB_DIR="${2:-/opt/identityhub}"
HUB_ORIGIN="${3:-https://identityhub.makketing.com}"
[[ "$RELEASE" =~ ^[0-9a-f]{40}$ ]] || { echo "Expected a full commit SHA" >&2; exit 1; }
cd "$HUB_DIR"
exec 9>/run/lock/identityhub-deploy.lock
flock -n 9 || { echo "Another IdentityHub deploy is running" >&2; exit 1; }
test -f .env
test -z "$(git status --porcelain)" || { echo "Server source has local edits; deployment stopped before making changes" >&2; exit 1; }
git fetch origin main
test "$(git rev-parse FETCH_HEAD)" = "$RELEASE" || { echo "GitHub main moved; use its latest tested commit" >&2; exit 1; }
OLD_COMMIT="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$OLD_COMMIT" "$RELEASE" || { echo "Server source cannot fast-forward to this release" >&2; exit 1; }

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/var/backups/identityhub/$STAMP"
umask 077
mkdir -p "$BACKUP"
chmod 700 "$BACKUP"
cp .env "$BACKUP/environment"
printf '%s\n' "$OLD_COMMIT" > "$BACKUP/previous-commit"
printf '%s\n' "$RELEASE" > "$BACKUP/release-commit"
OLD_IMAGE="$(docker inspect -f '{{.Image}}' identityhub-app)"
ROLLBACK_IMAGE="identityhub:rollback-$STAMP"
docker image tag "$OLD_IMAGE" "$ROLLBACK_IMAGE"
printf '%s\n' "$ROLLBACK_IMAGE" > "$BACKUP/previous-image"
echo "Backing up the live database to $BACKUP/database.dump"
docker compose exec -T db pg_dump -U identityhub --format=custom identityhub > "$BACKUP/database.dump"
test -s "$BACKUP/database.dump"

APP_CHANGED=0
finish() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    if [ "$APP_CHANGED" = 1 ]; then
      echo "Deployment failed; restoring the previous app image" >&2
      IDENTITYHUB_IMAGE="$ROLLBACK_IMAGE" docker compose up -d --no-deps --no-build --force-recreate app || echo "Automatic app rollback failed; use $ROLLBACK_IMAGE" >&2
    fi
    echo "Backups are in $BACKUP. Additive database changes are retained." >&2
  fi
  exit "$result"
}
trap finish EXIT

# Checkout files must stay readable by the image's unprivileged runtime user.
# The backup directory itself remains private, and the secrets above are 0600.
umask 022
git merge --ff-only "$RELEASE"
echo "Building IdentityHub release $RELEASE"
if ! docker compose build app > "$BACKUP/build.log" 2>&1; then
  tail -80 "$BACKUP/build.log"
  exit 1
fi
echo "Build completed; replacing only the IdentityHub app container"
APP_CHANGED=1
docker compose up -d --no-deps --no-build --force-recreate app

READY=0
for _ in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:8316/api/health > "$BACKUP/health.json"; then READY=1; break; fi
  sleep 2
done
test "$READY" = 1
curl -fsS "$HUB_ORIGIN/api/health" > "$BACKUP/public-health.json"
curl -fsS "$HUB_ORIGIN/login" > "$BACKUP/login.html"
grep -q 'ih-auth' "$BACKUP/login.html"
curl -fsS "$HUB_ORIGIN/widget.js" > "$BACKUP/widget.js"
grep -q 'Your identity. Your choice.' "$BACKUP/widget.js"
cmp -s .env "$BACKUP/environment" || { echo "Environment changed during deployment" >&2; exit 1; }
echo "DEPLOYED_COMMIT=$RELEASE"
echo "BACKUP=$BACKUP"
echo "LIVE_LOGIN=$HUB_ORIGIN/login"
docker compose ps
