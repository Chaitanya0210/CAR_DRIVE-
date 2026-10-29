import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, LedgerAccountType } from '@prisma/client';
import { applyDatabaseTriggers } from '../../scripts/apply-triggers';

const prisma = new PrismaClient();

describe('LedgerEntry Append-Only Constraint', () => {
  beforeAll(async () => {
    await applyDatabaseTriggers(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows inserting new ledger entries', async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
        actorId: 'test-user-id',
        debitPaise: BigInt(5000000), // ₹50,000
        creditPaise: BigInt(0),
        balanceAfterPaise: BigInt(5000000),
        narration: 'Initial deposit for test booking',
      },
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.entryNumber).toBeGreaterThan(0);
    expect(entry.debitPaise).toBe(BigInt(5000000));
    expect(entry.narration).toBe('Initial deposit for test booking');
  });

  it('rejects updates on ledger entries with DB trigger exception', async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.PLATFORM_REVENUE,
        actorId: 'test-user-id',
        debitPaise: BigInt(0),
        creditPaise: BigInt(1999900), // ₹19,999
        balanceAfterPaise: BigInt(1999900),
        narration: 'Seller registration fee',
      },
    });

    // Attempting to update MUST throw from the PostgreSQL trigger
    await expect(
      prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: { narration: 'Tampered narration' },
      })
    ).rejects.toThrowError(/LedgerEntry is append-only/);
  });

  it('rejects deletes on ledger entries with DB trigger exception', async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.SELLER_RECEIVABLE,
        actorId: 'test-seller-id',
        debitPaise: BigInt(100000000), // ₹10,00,000
        creditPaise: BigInt(0),
        balanceAfterPaise: BigInt(100000000),
        narration: 'Vehicle delivery payout',
      },
    });

    // Attempting to delete MUST throw from the PostgreSQL trigger
    await expect(
      prisma.ledgerEntry.delete({
        where: { id: entry.id },
      })
    ).rejects.toThrowError(/LedgerEntry is append-only/);
  });
});
