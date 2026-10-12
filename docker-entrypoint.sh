#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${APP_ORIGIN:?APP_ORIGIN must be set to the public https origin}"
: "${TOKEN_ENCRYPTION_KEY:?TOKEN_ENCRYPTION_KEY must be set}"
node scripts/migrate.mjs
exec node .output/server/index.mjs
