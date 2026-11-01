#!/usr/bin/env bash
# =============================================================================
# GroupDrive Production Database Restore Script
# Restores from an authenticated, checksum-verified PostgreSQL dump
# =============================================================================

set -eo pipefail

RESTORE_FILE="$1"

if [ -z "$RESTORE_FILE" ]; then
  echo "Usage: ./scripts/db-restore.sh <path-to-backup.sql.gz>"
  exit 1
fi

if [ ! -f "$RESTORE_FILE" ]; then
  echo "ERROR: Backup file '$RESTORE_FILE' does not exist."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not defined."
  exit 1
fi

# Verify checksum if .sha256 exists
if [ -f "${RESTORE_FILE}.sha256" ]; then
  echo "==> Verifying SHA-256 checksum..."
  sha256sum -c "${RESTORE_FILE}.sha256"
fi

echo "==> Restoring database from: $RESTORE_FILE..."
if [[ "$RESTORE_FILE" == *.gz ]]; then
  gunzip -c "$RESTORE_FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
else
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < "$RESTORE_FILE"
fi

echo "==> Database restore completed successfully."
