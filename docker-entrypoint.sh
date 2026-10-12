#!/bin/sh
set -eu
if [ "${VITE_AUTH_ENABLED:-}" != "false" ]; then
  : "${BETTER_AUTH_URL:?BETTER_AUTH_URL must be set (public origin)}"
  : "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET must be set}"
fi
: "${DATABASE_URL:?DATABASE_URL must be set; the embedded PGLite fallback is not for production}"
node scripts/migrate.mjs
exec node .output/server/index.mjs
