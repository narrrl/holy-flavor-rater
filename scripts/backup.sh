#!/bin/bash
set -euo pipefail

# Full snapshot of the SQLite database + user media. Host-side and safe to run
# while the Rust backend has the DB open (WAL mode): uses `sqlite3 .backup`
# when available, otherwise an online copy via the same backend container.
# The Rust scheduler also runs backup_db on its own interval; this is the
# manual/cron supplement. Best run as a daily cron job.

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full_snapshot_$TIMESTAMP"
TEMP_DIR="data/backups/$BACKUP_NAME"
FINAL_DEST="data/backups"
DB_SRC="data/db.sqlite3"

echo "========================================"
echo "   Starting Full Project Backup...      "
echo "========================================"

mkdir -p "$TEMP_DIR"

# 1. Database — consistent snapshot.
echo "Backing up database..."
if command -v sqlite3 &>/dev/null; then
    # Atomic, WAL-safe even with the backend holding the DB open.
    sqlite3 "$DB_SRC" ".backup '$TEMP_DIR/db.sqlite3'"
else
    # No host sqlite3: copy the DB plus its WAL sidecars so an in-flight WAL
    # isn't lost. Install sqlite3 for a guaranteed-atomic snapshot.
    echo "  host sqlite3 not found — copying db + WAL sidecars"
    cp "$DB_SRC" "$TEMP_DIR/db.sqlite3"
    [ -f "$DB_SRC-wal" ] && cp "$DB_SRC-wal" "$TEMP_DIR/db.sqlite3-wal"
    [ -f "$DB_SRC-shm" ] && cp "$DB_SRC-shm" "$TEMP_DIR/db.sqlite3-shm"
fi

# 2. Media.
echo "Backing up media..."
cp -r data/media "$TEMP_DIR/media"

# 3. Compress.
echo "Compressing..."
tar -czf "$FINAL_DEST/$BACKUP_NAME.tar.gz" -C "$FINAL_DEST" "$BACKUP_NAME"

# 4. Cleanup temp folder.
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Backup complete: $FINAL_DEST/$BACKUP_NAME.tar.gz"
echo "========================================"
