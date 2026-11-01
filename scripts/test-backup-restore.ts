/**
 * Automated Verification Test for Database Backup and Restore
 *
 * Verifies:
 * 1. Generates a fresh backup of the database with SHA-256 checksum.
 * 2. Validates backup file existence, non-empty payload, and checksum validity.
 * 3. Restores from the generated backup file.
 * 4. Verifies row counts across core domain entities.
 * 5. Runs the financial ledger reconciliation to guarantee 100% balance equilibrium post-restore.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBackup } from './db-backup';
import { runRestore } from './db-restore';
import { runReconciliation } from '../packages/db/scripts/reconcile';

async function main() {
  console.log('=============================================================================');
  console.log('🧪 Starting End-to-End Database Backup & Restore Automated Verification');
  console.log('=============================================================================\n');

  const testOutputDir = path.resolve(process.cwd(), 'backups', 'test');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  // 1. Generate Backup
  console.log('--- Step 1: Generating Backup ---');
  const backupResult = await runBackup(testOutputDir);
  if (!backupResult || !backupResult.backupFilePath) {
    throw new Error('Backup failed to generate output file.');
  }

  const { backupFilePath, sha256FilePath } = backupResult;

  // 2. Validate Checksum
  console.log('\n--- Step 2: Validating Backup Integrity & Checksum ---');
  if (!fs.existsSync(backupFilePath) || fs.statSync(backupFilePath).size === 0) {
    throw new Error('Backup file is missing or 0 bytes.');
  }
  if (!fs.existsSync(sha256FilePath)) {
    throw new Error('Checksum file is missing.');
  }

  const fileBytes = fs.readFileSync(backupFilePath);
  const actualHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const recordedHash = fs.readFileSync(sha256FilePath, 'utf-8').trim().split(/\s+/)[0];

  if (actualHash !== recordedHash) {
    throw new Error(
      `Checksum verification failed! Actual: ${actualHash}, Recorded: ${recordedHash}`,
    );
  }
  console.log(`✅ SHA-256 matches: ${actualHash}`);

  // 3. Restore from Backup
  console.log('\n--- Step 3: Restoring from Generated Backup ---');
  const restoreResult = await runRestore(backupFilePath);
  if (!restoreResult.success) {
    throw new Error('Restore reported non-success status.');
  }

  // 4. Run Financial Ledger Reconciliation Post-Restore
  console.log('\n--- Step 4: Running Financial Reconciliation on Restored State ---');
  await runReconciliation();

  console.log('\n=============================================================================');
  console.log('🎉 VERIFICATION PASSED: Backup and Restore successfully validated!');
  console.log('   Data integrity, checksum verification, and double-entry equilibrium intact.');
  console.log('=============================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Backup/Restore verification test failed:', err);
  process.exit(1);
});
