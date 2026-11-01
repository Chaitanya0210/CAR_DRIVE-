/**
 * GroupDrive Production Database Backup Tool
 *
 * Usage:
 *   pnpm db:backup
 *   tsx scripts/db-backup.ts [--output-dir ./backups]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

interface BackupMetadata {
  timestamp: string;
  database: string;
  backupFile: string;
  sha256: string;
  totalTables: number;
  totalRows: number;
  tables: Record<string, number>;
}

export async function runBackup(outputDir = path.resolve(process.cwd(), 'backups')) {
  console.log('\n=============================================================================');
  console.log('📦 GroupDrive Database Backup Utility');
  console.log('=============================================================================\n');

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5432/groupdrive?schema=public';
  const urlObj = new URL(dbUrl);
  const dbName = urlObj.pathname.replace(/^\//, '') || 'groupdrive';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `groupdrive_${dbName}_${timestamp}.sql`;
  const backupFilePath = path.join(outputDir, backupFileName);

  console.log(`Target Database: ${dbName} (${urlObj.hostname}:${urlObj.port || 5432})`);
  console.log(`Output File:     ${backupFilePath}`);

  let dumpSuccess = false;

  // Method 1: Try native pg_dump if available
  try {
    const whichCmd = process.platform === 'win32' ? 'where pg_dump' : 'which pg_dump';
    execSync(whichCmd, { stdio: 'ignore' });
    console.log('⚡ Found native pg_dump tool. Executing pg_dump...');
    execSync(
      `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges -f "${backupFilePath}"`,
      {
        stdio: 'inherit',
      },
    );
    dumpSuccess = true;
  } catch {
    console.log('ℹ️  Native pg_dump not found in PATH. Using Node.js streaming SQL dump engine...');
  }

  // Method 2: Node.js pure pg client dump
  if (!dumpSuccess) {
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const sqlParts: string[] = [];
      sqlParts.push(
        '-- =============================================================================',
      );
      sqlParts.push(`-- GroupDrive SQL Database Backup`);
      sqlParts.push(`-- Generated: ${new Date().toISOString()}`);
      sqlParts.push(`-- Database: ${dbName}`);
      sqlParts.push(
        '-- =============================================================================\n',
      );
      sqlParts.push('SET statement_timeout = 0;');
      sqlParts.push('SET lock_timeout = 0;\n');

      // Fetch all public user tables
      const tablesRes = await client.query<{ table_name: string }>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE '_prisma%'
        ORDER BY table_name;
      `);

      const tables = tablesRes.rows.map((r) => r.table_name);
      const tableCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const table of tables) {
        const countRes = await client.query<{ count: string }>(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countRes.rows[0]?.count || '0', 10);
        tableCounts[table] = count;
        totalRows += count;

        const dataRes = await client.query(`SELECT * FROM "${table}"`);
        if (dataRes.rows.length > 0) {
          sqlParts.push(`-- Data for table: "${table}" (${count} rows)`);
          const columns = Object.keys(dataRes.rows[0]);
          const colsEscaped = columns.map((c) => `"${c}"`).join(', ');

          for (const row of dataRes.rows) {
            const vals = columns.map((col) => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number' || typeof val === 'bigint') return String(val);
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (val instanceof Date) return `'${val.toISOString()}'`;
              if (typeof val === 'object')
                return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
              return `'${String(val).replace(/'/g, "''")}'`;
            });

            sqlParts.push(
              `INSERT INTO "${table}" (${colsEscaped}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;`,
            );
          }
          sqlParts.push('');
        }
      }

      fs.writeFileSync(backupFilePath, sqlParts.join('\n'), 'utf-8');

      // Compute SHA-256
      const fileBytes = fs.readFileSync(backupFilePath);
      const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');
      const sha256FilePath = `${backupFilePath}.sha256`;
      fs.writeFileSync(sha256FilePath, `${hash}  ${backupFileName}\n`, 'utf-8');

      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        database: dbName,
        backupFile: backupFileName,
        sha256: hash,
        totalTables: tables.length,
        totalRows,
        tables: tableCounts,
      };

      const metaFilePath = path.join(outputDir, `${backupFileName}.meta.json`);
      fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), 'utf-8');

      console.log(`\n✅ Backup successfully generated:`);
      console.log(`   File:     ${backupFilePath} (${(fileBytes.length / 1024).toFixed(1)} KB)`);
      console.log(`   Checksum: ${hash}`);
      console.log(`   Tables:   ${tables.length} tables, ${totalRows} total rows captured.`);
      return { backupFilePath, sha256FilePath, metaFilePath, metadata };
    } finally {
      await client.end();
    }
  }

  // Native pg_dump SHA-256
  const fileBytes = fs.readFileSync(backupFilePath);
  const hash = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const sha256FilePath = `${backupFilePath}.sha256`;
  fs.writeFileSync(sha256FilePath, `${hash}  ${backupFileName}\n`, 'utf-8');

  console.log(`\n✅ Backup successfully generated via pg_dump:`);
  console.log(`   File:     ${backupFilePath} (${(fileBytes.length / 1024).toFixed(1)} KB)`);
  console.log(`   Checksum: ${hash}`);
  return { backupFilePath, sha256FilePath };
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  });
}
