#!/bin/bash

# This script creates a full snapshot of the database and user media.
# Best run as a daily cron job.

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full_snapshot_$TIMESTAMP"
TEMP_DIR="backend/backups/$BACKUP_NAME"
FINAL_DEST="backend/backups"

echo "========================================"
echo "   Starting Full Project Backup...      "
echo "========================================"

mkdir -p "$TEMP_DIR"

# 1. Run the database backup command
echo "Backing up database..."
docker exec holy-backend python manage.py backup_db --output "/app/backups/$BACKUP_NAME/db.sqlite3"

# 2. Copy the media folder
echo "Backing up media..."
cp -r backend/media "$TEMP_DIR/media"

# 3. Create compressed archive
echo "Compressing..."
tar -czf "$FINAL_DEST/$BACKUP_NAME.tar.gz" -C "backend/backups" "$BACKUP_NAME"

# 4. Cleanup temp folder
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Backup complete: $FINAL_DEST/$BACKUP_NAME.tar.gz"
echo "========================================"
