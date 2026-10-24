#!/usr/bin/env bash
# Daily backup of the database + uploads.  Cron example:  0 3 * * * /path/to/ArtSpaceJo/scripts/backup.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${DATA_DIR:-$ROOT/data}"
OUT="$ROOT/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
# Consistent SQLite snapshot (safe while the server is running)
node -e "const D=require('better-sqlite3');new D('$DATA/artspace.db',{readonly:true}).backup('$OUT/artspace-$STAMP.db').then(()=>process.exit(0))"
tar -czf "$OUT/files-$STAMP.tar.gz" -C "$DATA" uploads media secret.key 2>/dev/null || true
# keep the last 30 backups
ls -1t "$OUT"/artspace-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f
ls -1t "$OUT"/files-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "Backup written to $OUT ($STAMP)"
