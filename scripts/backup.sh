#!/usr/bin/env bash
# Daily backup of the SQLite database + uploaded files.
# Cron example:  0 3 * * * /path/to/ArtSpaceJo/scripts/backup.sh
# Env: DATA_DIR (default <repo>/data), BACKUP_KEEP (default 30)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${DATA_DIR:-$ROOT/data}"
OUT="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${BACKUP_KEEP:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"
cd "$ROOT"

if [ ! -f "$DATA/artspace.db" ]; then
  echo "No database at $DATA/artspace.db — nothing to back up." >&2
  exit 1
fi

# Consistent SQLite snapshot (safe while the server is running).
# --input-type=commonjs keeps `require` available even though package.json sets "type": "module".
node --input-type=commonjs -e "
  const Database = require('$ROOT/node_modules/better-sqlite3');
  const db = new Database(process.argv[1], { readonly: true });
  db.backup(process.argv[2])
    .then(() => { db.close(); process.exit(0); })
    .catch((e) => { console.error('backup failed:', e); process.exit(1); });
" "$DATA/artspace.db" "$OUT/artspace-$STAMP.db"

# Uploads, generated media and the HMAC secret (keep the secret so existing signed links stay valid).
tar -czf "$OUT/files-$STAMP.tar.gz" -C "$DATA" uploads media secret.key 2>/dev/null || true

# Keep only the newest $KEEP of each kind. `tail -n +N` is POSIX; no `xargs -r` (GNU-only).
prune() {
  local pattern="$1"
  local list
  list="$(ls -1t "$OUT"/$pattern 2>/dev/null | tail -n +"$((KEEP + 1))" || true)"
  [ -n "$list" ] || return 0
  printf '%s\n' "$list" | while IFS= read -r f; do rm -f -- "$f"; done
}
prune 'artspace-*.db'
prune 'files-*.tar.gz'

echo "Backup written to $OUT ($STAMP)"
