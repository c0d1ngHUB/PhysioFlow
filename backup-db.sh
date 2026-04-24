#!/bin/bash
# PhysioFlow SQLite Backup Script
# Uses sqlite3 .backup for safe hot-backup (no corruption risk)
# Keeps last 30 days of backups, removes older ones

set -euo pipefail

DB_PATH="/home/m3kky/PhysioFlow/data/physioflow.db"
BACKUP_DIR="/home/m3kky/PhysioFlow/backups"
KEEP_DAYS=30

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Timestamp for this backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/physioflow_${TIMESTAMP}.db"

# Safe hot-backup via sqlite3 .backup command
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress the backup
gzip "$BACKUP_FILE"

# Verify the backup: decompress test + sqlite3 integrity check
if gunzip -t "${BACKUP_FILE}.gz" 2>/dev/null; then
    gunzip -k "${BACKUP_FILE}.gz"
    if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>/dev/null | grep -q "ok"; then
        echo "✅ Backup OK: ${BACKUP_FILE}.gz"
    else
        echo "❌ Backup integrity check FAILED: ${BACKUP_FILE}.gz"
    fi
    rm -f "$BACKUP_FILE"
else
    echo "❌ Backup gzip test FAILED: ${BACKUP_FILE}.gz"
fi

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "physioflow_*.db.gz" -mtime +$KEEP_DAYS -delete

echo "Backup complete: ${BACKUP_FILE}.gz"