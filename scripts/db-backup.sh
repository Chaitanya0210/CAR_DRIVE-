#!/usr/bin/env bash
# =============================================================================
# GroupDrive Production Database Backup Script
# Creates a timestamped, gzip-compressed PostgreSQL dump with SHA-256 checksum
# =============================================================================

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/groupdrive_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not defined."
  exit 1
fi

echo "==> Initiating GroupDrive PostgreSQL dump to: ${BACKUP_FILE}..."
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain | gzip -9 > "$BACKUP_FILE"

echo "==> Computing SHA-256 integrity checksum..."
sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"

echo "==> Backup complete:"
ls -lh "$BACKUP_FILE"
cat "$CHECKSUM_FILE"
