#!/bin/sh
# BloomNest backend entrypoint:
# 1. wait for the database (compose healthcheck already gates this, this is a
#    second safety net for manual docker run)
# 2. apply pending Prisma migrations
# 3. start the compiled API
set -e

echo "[entrypoint] waiting for database…"
i=0
until node -e "
  const net = require('net');
  const url = new URL(process.env.DATABASE_URL);
  const s = net.connect(parseInt(url.port || '5432'), url.hostname);
  s.on('connect', () => process.exit(0));
  s.on('error', () => process.exit(1));
  setTimeout(() => process.exit(1), 2000);
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[entrypoint] database unreachable after 30 tries — giving up"
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] applying migrations…"
npx prisma migrate deploy

# Auto-seed when the shop has no catalogue yet (first boot, or a fresh volume).
# The seed is idempotent and never overwrites prices, stock or uploaded photos,
# so an operator can also force it: `docker compose exec backend npm run seed`.
if [ "${SEED_ON_START:-1}" = "1" ]; then
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.flower.count().then((c) => process.exit(c === 0 ? 0 : 1)).catch(() => process.exit(1)).finally(() => p.\$disconnect());
  " 2>/dev/null; then
    echo "[entrypoint] empty catalogue detected — seeding demonstration data…"
    npx tsx prisma/seed.ts || echo "[entrypoint] ⚠️  auto-seed failed — run 'docker compose exec backend npm run seed' manually"
  fi
fi

echo "[entrypoint] starting API on port ${PORT:-4000}"
exec node dist/server.js
