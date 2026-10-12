#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL must be set; the embedded PGLite fallback is not for production}"
node scripts/migrate.mjs
exec node .output/server/index.mjs
