/**
 * GroupDrive Production Database Restore Tool
 *
 * Usage:
 *   pnpm db:restore
 *   tsx scripts/db-restore.ts [--file ./backups/groupdrive_backup_xxx.sql]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';

export async function runRestore(targetFilePath?: string) {
  console.log('\n=============================================================================');
  console.log('🔄 GroupDrive Database Restore Utility');
  console.log('=============================================================================\n');

  const backupsDir = path.resolve(process.cwd(), 'backups');

  let fileToRestore = targetFilePath;
  if (!fileToRestore) {
    if (!fs.existsSync(backupsDir)) {
      throw new Error(`Backups directory '${backupsDir}' does not exist.`);
    }

    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => ({
        name: f,
        fullPath: path.join(backupsDir, f),
        mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      throw new Error(`No .sql backup files found in '${backupsDir}'.`);
    }

    fileToRestore = files[0].fullPath;
  }

  if (!fs.existsSync(fileToRestore)) {
    throw new Error(`Target restore file '${fileToRestore}' does not exist.`);
  }

  console.log(`Restore Source File: ${fileToRestore}`);

  // 1. Verify SHA-256 Checksum if .sha256 exists
  const sha256File = `${fileToRestore}.sha256`;
  if (fs.existsSync(sha256File)) {
    console.log('🔒 Verifying SHA-256 checksum integrity...');
    const recordedHash = fs.readFileSync(sha256File, 'utf-8').trim().split(/\s+/)[0];
    const actualBytes = fs.readFileSync(fileToRestore);
    const computedHash = crypto.createHash('sha256').update(actualBytes).digest('hex');

    if (recordedHash.toLowerCase() !== computedHash.toLowerCase()) {
      throw new Error(
        `CRITICAL: Backup file checksum mismatch! Recorded: ${recordedHash}, Computed: ${computedHash}. Aborting restore.`,
      );
    }
    console.log(`✅ Checksum verified: ${computedHash}`);
  } else {
    console.warn(
      '⚠️  Warning: No .sha256 checksum file found. Proceeding with unverified archive.',
    );
  }

  // 2. Connect to database
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5432/groupdrive?schema=public';
  const urlObj = new URL(dbUrl);
  console.log(
    `Target Database:     ${urlObj.pathname.replace(/^\//, '')} (${urlObj.hostname}:${urlObj.port || 5432})`,
  );

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const sqlContent = fs.readFileSync(fileToRestore, 'utf-8');
    console.log(`Executing SQL restore payload (${(sqlContent.length / 1024).toFixed(1)} KB)...`);

    // Execute in a transaction
    await client.query('BEGIN;');
    await client.query(sqlContent);
    await client.query('COMMIT;');

    console.log('✅ SQL restore executed successfully.');

    // 3. Post-Restore Integrity Verification
    console.log('\n🔍 Running Post-Restore Sanity Checks:');
    const userCount = await client.query<{ count: string }>('SELECT COUNT(*) FROM "User";');
    const groupCount = await client.query<{ count: string }>('SELECT COUNT(*) FROM "Group";');
    const ledgerCount = await client.query<{ count: string }>(
      'SELECT COUNT(*) FROM "LedgerEntry";',
    );
    const vehicleCount = await client.query<{ count: string }>('SELECT COUNT(*) FROM "Variant";');

    console.log(`   • Users restored:          ${userCount.rows[0]?.count || 0}`);
    console.log(`   • Groups restored:         ${groupCount.rows[0]?.count || 0}`);
    console.log(`   • Vehicle Variants:        ${vehicleCount.rows[0]?.count || 0}`);
    console.log(`   • Double-Entry Vouchers:   ${ledgerCount.rows[0]?.count || 0}`);

    console.log('\n🎉 Database restore operation completed with zero errors.\n');
    return {
      success: true,
      fileRestored: fileToRestore,
      users: userCount.rows[0]?.count,
      groups: groupCount.rows[0]?.count,
      ledgerEntries: ledgerCount.rows[0]?.count,
    };
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf('--file');
  const targetFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : undefined;

  runRestore(targetFile).catch((err) => {
    console.error('❌ Restore failed:', err);
    process.exit(1);
  });
}
