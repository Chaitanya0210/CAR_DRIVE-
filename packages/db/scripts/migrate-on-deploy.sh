#!/usr/bin/env bash
# =============================================================================
# GroupDrive Production Database Migration Entrypoint
# =============================================================================

set -eo pipefail

echo "==> Running GroupDrive database migration pre-flight checks..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "==> Applying forward-only schema migrations..."
pnpm --filter @groupdrive/db exec prisma migrate deploy

echo "==> Database migration complete."
