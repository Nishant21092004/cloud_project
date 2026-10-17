#!/usr/bin/env bash
# rebuild.sh — apply backend/frontend/prisma changes to a running Docker stack.
#
# On the Ubuntu VM:  ./scripts/rebuild.sh           (build + restart + seed)
# Data-only change:  ./scripts/rebuild.sh --seed-only
# Truly from zero:   ./scripts/rebuild.sh --full     (--no-cache, slowest)
#
# Why a script: the failure mode is always the same — the code is correct, the
# browser still shows yesterday's container. Either the image was not rebuilt
# or the seed never ran. This does both in the right order and then tells you
# what the catalogue actually contains.
set -euo pipefail
cd "$(dirname "$0")/.."

SEED=1
MODE=""
for arg in "$@"; do
  case "$arg" in
    --seed-only) SEED=0; MODE="seed-only" ;;
    --full) MODE="full" ;;
    --no-seed) SEED=0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

compose() {
  if docker compose version >/dev/null 2>&1; then docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then docker-compose "$@"
  else echo "!! docker compose is not installed. On Ubuntu: sudo apt-get install -y docker-compose-plugin" >&2; exit 1; fi
}

say() { printf '\n\033[32m==> %s\033[0m\n' "$1"; }

if [ "$MODE" = "seed-only" ]; then
  say "Re-seeding only"
  compose exec -T backend npm run seed
  say "Done — hard-refresh the browser (Ctrl+Shift+R)"
  exit 0
fi

if [ "$MODE" = "full" ]; then
  say "Building images with --no-cache"
  compose build --no-cache
else
  say "Building images"
  compose build
fi

say "Restarting the stack"
compose down
compose up -d

say "Waiting for the API"
ready=0
for _ in $(seq 1 40); do
  if compose exec -T backend node -e "fetch('http://localhost:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    ready=1; break
  fi
  sleep 3
done
[ "$ready" = 1 ] || echo "!! API not ready after 120s — check: compose logs --tail=80 backend" >&2

if [ "$SEED" = 1 ]; then
  say "Seeding catalogue + delivery pincodes"
  compose exec -T backend npm run seed
else
  say "Skipped seeding (pass no flag to include it; use --seed-only to run just the seed)"
fi

say "Catalogue in the database right now"
compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([p.flower.count(), p.plant.count(), p.bouquet.count(), p.serviceablePincode.count()])
  .then(r => { console.log('  flowers=' + r[0] + ' plants=' + r[1] + ' bouquets=' + r[2] + ' pincodes=' + r[3]); process.exit(0); });
" || true

PORT="${WEB_PORT:-80}"
say "Done"
echo "  shop:  http://localhost:${PORT}/flowers   (hover a card for the photo strip)"
echo "  demo:  demo@bloomnest.test / Demo@1234"
echo "  admin: admin@bloomnest.test / Admin@1234"
