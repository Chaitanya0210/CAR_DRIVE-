import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function applyDatabaseTriggers(client: PrismaClient = prisma) {
  console.log('Applying database triggers and rules...');

  // 1. Create function
  await client.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION enforce_ledger_entry_append_only()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'LedgerEntry is append-only: updates and deletes are prohibited.';
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 2. Drop existing trigger if present
  await client.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_ledger_entry_append_only ON "LedgerEntry";
  `);

  // 3. Create trigger
  await client.$executeRawUnsafe(`
    CREATE TRIGGER trg_ledger_entry_append_only
    BEFORE UPDATE OR DELETE ON "LedgerEntry"
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ledger_entry_append_only();
  `);

  console.log('Successfully applied LedgerEntry append-only trigger.');
}

if (require.main === module || process.argv[1]?.endsWith('apply-triggers.ts')) {
  applyDatabaseTriggers()
    .catch((err) => {
      console.error('Failed to apply triggers:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
