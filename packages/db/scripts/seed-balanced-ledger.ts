import { PrismaClient, LedgerAccountType, PaymentStatus, SettlementStatus } from '@prisma/client';
import { applyDatabaseTriggers } from './apply-triggers.js';

const prisma = new PrismaClient();

export async function seedBalancedLedger() {
  console.log('🔄 Resetting LedgerEntry table and seeding double-entry vouchers...');

  // 1. Drop trigger to allow truncation
  await prisma.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS trg_ledger_entry_append_only ON "LedgerEntry";`,
  );
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LedgerEntry" RESTART IDENTITY CASCADE;`);

  // 2. Re-apply append-only trigger
  await applyDatabaseTriggers(prisma);

  // 3. Mark 2 dealer registration payments as CAPTURED
  const registrationPayments = await prisma.sellerRegistrationPayment.findMany({ take: 2 });
  for (const reg of registrationPayments) {
    await prisma.sellerRegistrationPayment.update({
      where: { id: reg.id },
      data: {
        status: PaymentStatus.CAPTURED,
        paidAt: new Date(),
      },
    });
  }

  // Running balance trackers
  let runningEscrowHold = 0n;
  let runningSellerReceivable = 0n;
  let runningPlatformRevenue = 0n;
  let runningTaxPayable = 0n;

  // 4. Seed Balanced Buyer Token Deposit Vouchers (5 buyers x ₹5,000)
  const memberships = await prisma.membership.findMany({
    take: 5,
    include: { buyerProfile: true },
  });

  for (let i = 0; i < memberships.length; i++) {
    const m = memberships[i];
    const buyerName = m.buyerProfile.fullName;
    const tokenPaise = 500000n; // ₹5,000

    // Leg A: Asset Debit (Escrow Hold increases)
    runningEscrowHold += tokenPaise;
    await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
        actorId: m.buyerProfileId,
        debitPaise: tokenPaise,
        creditPaise: 0n,
        balanceAfterPaise: runningEscrowHold,
        narration: `Token advance paid by ${buyerName} for Scorpio-N Baramati Group`,
      },
    });

    // Leg B: Liability Credit (Seller allocation liability increases)
    runningSellerReceivable += tokenPaise;
    await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.SELLER_RECEIVABLE,
        actorId: m.buyerProfileId,
        debitPaise: 0n,
        creditPaise: tokenPaise,
        balanceAfterPaise: runningSellerReceivable,
        narration: `Pending delivery escrow liability for ${buyerName}`,
      },
    });
  }

  // 5. Seed Balanced Seller Registration Vouchers (2 sellers)
  for (const reg of registrationPayments) {
    const grossPaise = BigInt(reg.totalAmountPaise); // 2,359,882 paise
    const netRevenuePaise = BigInt(reg.amountPaise); // 1,999,900 paise
    const gstPaise = BigInt(reg.gstAmountPaise); // 359,982 paise

    // Leg A: Clearing Debit
    runningEscrowHold += grossPaise;
    await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
        actorId: reg.sellerProfileId,
        debitPaise: grossPaise,
        creditPaise: 0n,
        balanceAfterPaise: runningEscrowHold,
        narration: `Seller registration fee captured via payment gateway (${reg.gatewayPaymentRef})`,
      },
    });

    // Leg B: Revenue Credit
    runningPlatformRevenue += netRevenuePaise;
    await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.PLATFORM_REVENUE,
        actorId: reg.sellerProfileId,
        debitPaise: 0n,
        creditPaise: netRevenuePaise,
        balanceAfterPaise: runningPlatformRevenue,
        narration: `Seller onboarding net platform revenue (₹19,999)`,
      },
    });

    // Leg C: Tax Payable Credit (18% GST)
    runningTaxPayable += gstPaise;
    await prisma.ledgerEntry.create({
      data: {
        accountType: LedgerAccountType.TAX_PAYABLE,
        actorId: reg.sellerProfileId,
        debitPaise: 0n,
        creditPaise: gstPaise,
        balanceAfterPaise: runningTaxPayable,
        narration: `18% GST output collected on seller registration`,
      },
    });
  }

  // 6. Seed a Processed Settlement Voucher
  // Deal Value: ₹15,24,000 (152,400,000 paise)
  // Commission 1%: 1,524,000 paise
  // GST on Commission 18%: 274,320 paise
  // Net Seller Payout: 150,601,680 paise
  const dealValuePaise = 152400000n;
  const commissionPaise = 1524000n;
  const gstPaise = 274320n;
  const netSellerPayoutPaise = dealValuePaise - commissionPaise - gstPaise;

  const sampleSeller = await prisma.sellerProfile.findFirst();
  if (sampleSeller) {
    // Check or create booking and settlement
    const sampleBooking = await prisma.booking.findFirst();
    if (sampleBooking) {
      await prisma.settlement.upsert({
        where: { bookingId: sampleBooking.id },
        create: {
          bookingId: sampleBooking.id,
          sellerProfileId: sampleSeller.id,
          grossDealValuePaise: dealValuePaise,
          commissionPercent: 1.0,
          platformCommissionPaise: commissionPaise,
          netPayableToSellerPaise: netSellerPayoutPaise,
          status: SettlementStatus.PROCESSED,
          settledAt: new Date(),
        },
        update: {
          status: SettlementStatus.PROCESSED,
          settledAt: new Date(),
        },
      });

      // Leg A: Debit Seller Receivable (clearing liability)
      runningSellerReceivable -= dealValuePaise;
      await prisma.ledgerEntry.create({
        data: {
          accountType: LedgerAccountType.SELLER_RECEIVABLE,
          bookingId: sampleBooking.id,
          actorId: sampleSeller.id,
          debitPaise: dealValuePaise,
          creditPaise: 0n,
          balanceAfterPaise: runningSellerReceivable,
          narration: `Settlement payout execution for booking ${sampleBooking.bookingNumber}`,
        },
      });

      // Leg B: Credit Escrow Hold (bank payout disbursed)
      runningEscrowHold -= netSellerPayoutPaise;
      await prisma.ledgerEntry.create({
        data: {
          accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
          bookingId: sampleBooking.id,
          actorId: sampleSeller.id,
          debitPaise: 0n,
          creditPaise: netSellerPayoutPaise,
          balanceAfterPaise: runningEscrowHold,
          narration: `Net dealer payout released to seller bank account`,
        },
      });

      // Leg C: Credit Platform Revenue (1% commission)
      runningPlatformRevenue += commissionPaise;
      await prisma.ledgerEntry.create({
        data: {
          accountType: LedgerAccountType.PLATFORM_REVENUE,
          bookingId: sampleBooking.id,
          actorId: sampleSeller.id,
          debitPaise: 0n,
          creditPaise: commissionPaise,
          balanceAfterPaise: runningPlatformRevenue,
          narration: `1% platform commission on vehicle deal settlement`,
        },
      });

      // Leg D: Credit Tax Payable (18% GST on commission)
      runningTaxPayable += gstPaise;
      await prisma.ledgerEntry.create({
        data: {
          accountType: LedgerAccountType.TAX_PAYABLE,
          bookingId: sampleBooking.id,
          actorId: sampleSeller.id,
          debitPaise: 0n,
          creditPaise: gstPaise,
          balanceAfterPaise: runningTaxPayable,
          narration: `18% GST on platform commission`,
        },
      });
    }
  }

  console.log('✅ Successfully seeded clean, balanced, double-entry ledger vouchers.');
}

if (require.main === module || process.argv[1]?.endsWith('seed-balanced-ledger.ts')) {
  seedBalancedLedger()
    .catch((err) => {
      console.error('Failed to seed balanced ledger:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
