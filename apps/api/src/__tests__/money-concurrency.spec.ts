import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { GroupStatus, RfqStatus, QuoteStatus } from '@groupdrive/db';

describe('Financial & Auction Concurrency Suite', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, PrismaService],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Keep connection pool alive for other parallel test suites
  });

  // ===========================================================================
  // Test 1: Two Members Booking Simultaneously (Only 1 Slot Remaining)
  // ===========================================================================
  it('concurrency: exactly one buyer succeeds when booking the final group slot', async () => {
    // 1. Find a test variant and zone
    const variant = await prisma.variant.findFirst();
    const zone = await prisma.zone.findFirst({ where: { level: 'TALUKA' } });
    const buyers = await prisma.buyerProfile.findMany({ take: 2 });

    expect(variant).toBeDefined();
    expect(zone).toBeDefined();
    expect(buyers.length).toBeGreaterThanOrEqual(2);

    // 2. Create a test group with targetCount = 1 (only 1 single slot available!)
    const testGroup = await prisma.group.create({
      data: {
        variantId: variant!.id,
        targetZoneId: zone!.id,
        targetCount: 1,
        currentCount: 0,
        status: GroupStatus.FORMING,
        deadline: new Date(Date.now() + 86400000),
      },
    });

    const buyer1Id = buyers[0].id;
    const buyer2Id = buyers[1].id;

    // 3. Fire simultaneous booking requests
    const [result1, result2] = await Promise.allSettled([
      service.bookGroupSlotWithConcurrencyControl(testGroup.id, buyer1Id),
      service.bookGroupSlotWithConcurrencyControl(testGroup.id, buyer2Id),
    ]);

    // 4. Assert: Exactly one fulfilled, exactly one rejected with ConflictException
    const fulfilledResults = [result1, result2].filter((r) => r.status === 'fulfilled');
    const rejectedResults = [result1, result2].filter((r) => r.status === 'rejected');

    expect(fulfilledResults.length).toBe(1);
    expect(rejectedResults.length).toBe(1);

    // Verify rejection reason is capacity or serialization conflict
    const rejectionReason = (rejectedResults[0] as PromiseRejectedResult).reason;
    const isConflict =
      rejectionReason instanceof ConflictException ||
      rejectionReason?.name === 'ConflictException' ||
      rejectionReason?.name === 'PrismaClientKnownRequestError' ||
      /conflict|capacity|deadlock|concurrent/i.test(rejectionReason?.message || '');
    expect(isConflict).toBe(true);

    // 5. Verify final database state: count must be exactly 1, no overbooking
    const finalGroup = await prisma.group.findUnique({
      where: { id: testGroup.id },
      include: { memberships: true },
    });
    expect(finalGroup?.currentCount).toBe(1);
    expect(finalGroup?.memberships.length).toBe(1);

    // Cleanup
    await prisma.booking.deleteMany({ where: { membership: { groupId: testGroup.id } } });
    await prisma.membership.deleteMany({ where: { groupId: testGroup.id } });
    await prisma.group.delete({ where: { id: testGroup.id } });
  });

  // ===========================================================================
  // Test 2: Seller Revising Quote As Bidding Window Closes
  // ===========================================================================
  it('concurrency: rejects late quote revision if bidding window closes concurrently', async () => {
    // 1. Create a dummy group, RFQ, and seller quote
    const variant = await prisma.variant.findFirst();
    const zone = await prisma.zone.findFirst({ where: { level: 'TALUKA' } });
    const dealer = await prisma.sellerProfile.findFirst({ include: { branches: true } });

    const group = await prisma.group.create({
      data: {
        variantId: variant!.id,
        targetZoneId: zone!.id,
        targetCount: 5,
        currentCount: 5,
        status: GroupStatus.FORMING,
        deadline: new Date(Date.now() + 86400000),
      },
    });

    const closeTimestamp = new Date(Date.now() + 100); // closes in 100ms
    const rfq = await prisma.rFQ.create({
      data: {
        groupId: group.id,
        rfqNumber: `RFQ-RACE-${Date.now()}`,
        status: RfqStatus.BIDDING_OPEN,
        bidWindowClosesAt: closeTimestamp,
      },
    });

    const quote = await prisma.quote.create({
      data: {
        rfqId: rfq.id,
        sellerProfileId: dealer!.id,
        branchId: dealer!.branches[0].id,
        status: QuoteStatus.NORMALIZED,
        exShowroomPaise: 150000000n,
        batchGroupDiscountPaise: 5000000n, // original ₹50,000 discount
        dealerLogisticsToZonePaise: 1000000n,
        roadTaxRtoPaise: 15000000n,
        insuranceEstimatePaise: 4000000n,
        fastagRegistrationCessPaise: 250000n,
        tcsPaise: 1500000n,
        totalLandedCostPaise: 166750000n,
        deliveryTimelineDays: 14,
        validityDate: new Date(Date.now() + 86400000),
      },
    });

    // Worker A: advances RFQ status to QUOTES_CLOSED right as window elapses
    const closeTask = (async () => {
      await prisma.rFQ.update({
        where: { id: rfq.id },
        data: {
          status: RfqStatus.QUOTES_CLOSED,
          bidWindowClosesAt: new Date(Date.now() - 1000), // closed 1 sec ago
        },
      });
    })();

    // Worker B: attempts to submit an aggressive revision
    const reviseTask = (async () => {
      // Simulate slight delay to race with close
      await new Promise((resolve) => setTimeout(resolve, 20));
      return service.reviseQuoteWithBiddingWindowGuard(rfq.id, quote.id, dealer!.id, {
        exShowroomDiscountPaise: 8000000, // ₹80,000 revised discount
        logisticsCostPaise: 800000,
        revisedAt: new Date(), // current time > close time
      });
    })();

    await closeTask;
    await expect(reviseTask).rejects.toThrow(ConflictException);

    // Verify quote discount remained original ₹50,000, not corrupted
    const uncorruptedQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
    });
    expect(uncorruptedQuote?.batchGroupDiscountPaise).toBe(5000000n);

    // Cleanup
    await prisma.quote.delete({ where: { id: quote.id } });
    await prisma.rFQ.delete({ where: { id: rfq.id } });
    await prisma.group.delete({ where: { id: group.id } });
  });

  // ===========================================================================
  // Test 3: Duplicate Payment Webhooks Delivered Simultaneously
  // ===========================================================================
  it('idempotency: concurrent duplicate webhooks result in exactly 1 payment record', async () => {
    const booking = await prisma.booking.findFirstOrThrow();
    const buyer = await prisma.buyerProfile.findFirstOrThrow();
    const testTxRef = `pay_race_${Date.now()}`;
    const testEventId = `evt_race_${Date.now()}`;

    const webhookPayload = {
      eventId: testEventId,
      eventType: 'payment.captured' as const,
      gatewayTransactionRef: testTxRef,
      amountPaise: 2500000, // ₹25,000
      bookingId: booking.id,
      actorId: buyer.id,
    };

    // Fire duplicate webhooks concurrently
    const [resA, resB] = await Promise.all([
      service.handlePaymentWebhook(webhookPayload),
      service.handlePaymentWebhook(webhookPayload),
    ]);

    // Both calls must succeed (HTTP 200 OK)
    expect(resA).toBeDefined();
    expect(resB).toBeDefined();

    // Exactly one was processed first, and the other returned idempotent cached status
    const wasFirstProcessed = [resA.alreadyProcessed, resB.alreadyProcessed];
    expect(wasFirstProcessed).toContain(false);
    expect(wasFirstProcessed).toContain(true);

    // Verify in database: Exactly ONE payment record exists for this gatewayTransactionRef
    const createdPayments = await prisma.payment.findMany({
      where: { gatewayTransactionRef: testTxRef },
    });
    expect(createdPayments.length).toBe(1);
    expect(createdPayments[0].amountPaise).toBe(2500000n);
    expect(createdPayments[0].status).toBe('CAPTURED');

    // Cleanup test payment
    await prisma.payment.deleteMany({
      where: { gatewayTransactionRef: testTxRef },
    });
  });
});
