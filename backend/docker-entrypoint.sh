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

echo "[entrypoint] starting API on port ${PORT:-4000}"
exec node dist/server.js
