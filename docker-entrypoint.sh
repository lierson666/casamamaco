#!/bin/sh
set -e
# Seed só no primeiro start (banco novo), para não recriar dados apagados.
FIRST_RUN=0
[ -f "$DATABASE_PATH" ] || FIRST_RUN=1

npm run db:migrate
[ "$FIRST_RUN" = "1" ] && npm run db:seed

exec npx next start
