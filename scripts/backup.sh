#!/usr/bin/env bash
# BloomNest backup — database dump + uploaded images in one timestamped folder.
#   ./scripts/backup.sh [output-dir]     # default ./backups
# Restore:
#   gunzip -c <dir>/bloomnest-*.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail

OUT="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "→ dumping database…"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$OUT/bloomnest-$STAMP.sql.gz"

echo "→ archiving uploads volume…"
docker run --rm -v bloomnestuploads:/data:ro -v "$(cd "$OUT" && pwd):/backup" alpine \
  tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .

echo "✅ backup complete:"
ls -lh "$OUT" | grep "$STAMP"
echo "Remember to copy backups OFF the VM (object storage / another machine)."
