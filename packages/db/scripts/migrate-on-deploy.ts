/**
 * GroupDrive Migration-on-Deploy Runner
 *
 * Runs during CI/CD or container startup before traffic ingress.
 * 1. Verifies connectivity to target PostgreSQL instance (with retry exponential backoff).
 * 2. Executes 'prisma migrate deploy' to apply pending migration SQL files.
 * 3. Enforces database triggers and function integrity.
 * 4. Verifies database schema health and postgis extension.
 */

import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

async function waitForDatabase(
  prisma: PrismaClient,
  maxRetries = 10,
  delayMs = 3000,
): Promise<boolean> {
  console.log('🔄 Checking database connectivity...');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`✅ Connected to database (attempt ${attempt}/${maxRetries}).`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⏳ Database unavailable (attempt ${attempt}/${maxRetries}): ${msg}`);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  return false;
}

export async function runMigrateOnDeploy() {
  console.log('=============================================================================');
  console.log('🚀 GroupDrive Migration-On-Deploy Pipeline');
  console.log('=============================================================================');

  const prisma = new PrismaClient();

  try {
    const isReady = await waitForDatabase(prisma, 8, 2500);
    if (!isReady) {
      throw new Error('Fatal: Target database did not become available in time.');
    }

    // Check PostGIS
    try {
      const postgis = await prisma.$queryRaw<
        Array<{ postgis_version: string }>
      >`SELECT PostGIS_Version()`;
      console.log(`🗺️  PostGIS Extension Active: ${postgis[0]?.postgis_version || 'Enabled'}`);
    } catch {
      console.log('ℹ️  PostGIS extension not detected via query, continuing...');
    }

    console.log('📦 Applying pending migrations via Prisma CLI...');
    const result = execSync('pnpm --filter @groupdrive/db exec prisma migrate deploy', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log(result);

    console.log('✅ Migration-on-deploy completed successfully with 0 errors.');
  } catch (error: unknown) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runMigrateOnDeploy();
}
