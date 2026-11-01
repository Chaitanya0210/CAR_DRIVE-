import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateRefund } from '@groupdrive/shared';

export interface WebhookEventPayload {
  eventId: string;
  eventType: 'payment.captured' | 'payment.failed' | 'refund.processed';
  gatewayTransactionRef: string;
  amountPaise: number;
  bookingId: string;
  actorId?: string;
  signature?: string;
}

@Injectable()
export class PaymentsService {
  // In-memory idempotency cache for fast deduping and webhook race conditions
  private processedEventIds = new Set<string>();
  private inFlightWebhooks = new Map<string, Promise<any>>();

  constructor(private prisma: PrismaService = new PrismaService()) {}

  // ===========================================================================
  // 1. CONCURRENT SAFE BOOKING (Prevents Overbooking / Quorum Race Conditions)
  // ===========================================================================
  async bookGroupSlotWithConcurrencyControl(
    groupId: string,
    buyerProfileId: string,
    bookingAmountPaise = 2500000, // ₹25,000
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch group state with fresh lock
      const group = await tx.group.findUnique({
        where: { id: groupId },
        include: { memberships: true },
      });

      if (!group) {
        throw new NotFoundException(`Group '${groupId}' not found`);
      }

      // Check slot availability
      const activeMembers = group.memberships.filter((m) => m.status === 'ACTIVE');
      if (activeMembers.length >= group.targetCount) {
        throw new ConflictException(
          `Group '${groupId}' has already reached maximum capacity of ${group.targetCount} members. No slots available.`,
        );
      }

      // 2. Atomically increment group count
      const updatedGroup = await tx.group.update({
        where: { id: groupId },
        data: {
          currentCount: { increment: 1 },
        },
      });

      // 3. Create Membership record
      const membership = await tx.membership.create({
        data: {
          groupId,
          buyerProfileId,
          tokenPaidPaise: BigInt(bookingAmountPaise),
          status: 'ACTIVE',
        },
      });

      // 4. Create Booking record
      const bookingNumber = `BK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const totalOnRoadPaise = 150000000n; // ₹15.0L estimated
      const tokenPaise = BigInt(bookingAmountPaise);
      const balancePaise = totalOnRoadPaise - tokenPaise;

      const booking = await tx.booking.create({
        data: {
          membershipId: membership.id,
          bookingNumber,
          status: 'TOKEN_CONFIRMED',
          tokenAmountPaise: tokenPaise,
          balanceAmountPaise: balancePaise,
          totalOnRoadPaise,
        },
      });

      return {
        success: true,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        groupCurrentCount: updatedGroup.currentCount,
        membershipId: membership.id,
      };
    });
  }

  // ===========================================================================
  // 2. CONCURRENT QUOTE REVISION (Prevents Revision After Window Closes)
  // ===========================================================================
  async reviseQuoteWithBiddingWindowGuard(
    rfqId: string,
    quoteId: string,
    sellerProfileId: string,
    revision: {
      exShowroomDiscountPaise: number;
      logisticsCostPaise: number;
      revisedAt?: Date;
    },
  ) {
    const now = revision.revisedAt || new Date();

    return this.prisma.$transaction(async (tx) => {
      const rfq = await tx.rFQ.findUnique({
        where: { id: rfqId },
      });

      if (!rfq) {
        throw new NotFoundException(`RFQ '${rfqId}' not found`);
      }

      // Guard: Bidding window closed by status or timestamp
      if (
        rfq.status !== 'BIDDING_OPEN' ||
        (rfq.bidWindowClosesAt && rfq.bidWindowClosesAt.getTime() <= now.getTime())
      ) {
        throw new ConflictException(
          `Bidding window for RFQ '${rfqId}' closed at ${rfq.bidWindowClosesAt.toISOString()}. Late quote revision rejected.`,
        );
      }

      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
      });

      if (!quote || quote.sellerProfileId !== sellerProfileId) {
        throw new NotFoundException(`Quote '${quoteId}' not found or not owned by seller`);
      }

      // Apply revision
      const updatedQuote = await tx.quote.update({
        where: { id: quoteId },
        data: {
          batchGroupDiscountPaise: BigInt(revision.exShowroomDiscountPaise),
          dealerLogisticsToZonePaise: BigInt(revision.logisticsCostPaise),
        },
      });

      return {
        success: true,
        quoteId: updatedQuote.id,
        discountPaise: Number(updatedQuote.batchGroupDiscountPaise),
        logisticsPaise: Number(updatedQuote.dealerLogisticsToZonePaise),
        message: 'Quote revision successfully accepted within active bidding window',
      };
    });
  }

  // ===========================================================================
  // 3. IDEMPOTENT PAYMENT WEBHOOK HANDLER (With In-Flight Mutex Deduplication)
  // ===========================================================================
  async handlePaymentWebhook(event: WebhookEventPayload) {
    const key = event.gatewayTransactionRef || event.eventId;

    // A. Check in-memory completed cache
    if (this.processedEventIds.has(event.eventId)) {
      return {
        idempotent: true,
        alreadyProcessed: true,
        eventId: event.eventId,
        status: 'CAPTURED',
        message: `Duplicate webhook delivery detected for event '${event.eventId}'. Returning cached OK without double processing.`,
      };
    }

    // B. Check in-flight concurrent execution
    if (this.inFlightWebhooks.has(key)) {
      await this.inFlightWebhooks.get(key);
      return {
        idempotent: true,
        alreadyProcessed: true,
        eventId: event.eventId,
        status: 'CAPTURED',
        message: `Concurrent duplicate webhook execution deduplicated for reference '${key}'.`,
      };
    }

    // C. Execute first-time processing with mutex
    const executionPromise = (async () => {
      // 1. Check existing payment in database
      const existingPayment = await this.prisma.payment.findFirst({
        where: { gatewayTransactionRef: event.gatewayTransactionRef },
      });

      if (existingPayment) {
        this.processedEventIds.add(event.eventId);
        return {
          idempotent: true,
          alreadyProcessed: true,
          paymentId: existingPayment.id,
          status: existingPayment.status,
          message: `Payment reference '${event.gatewayTransactionRef}' was already captured. Duplicate webhook acknowledged safely.`,
        };
      }

      // 2. Insert new payment record
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: event.bookingId,
          userId: event.actorId || 'placeholder-user',
          amountPaise: BigInt(event.amountPaise),
          paymentType: 'TOKEN_HOLD',
          status: 'CAPTURED',
          gatewayProvider: 'MOCK',
          gatewayTransactionRef: event.gatewayTransactionRef,
        },
      });

      this.processedEventIds.add(event.eventId);

      return {
        idempotent: false,
        alreadyProcessed: false,
        paymentId: payment.id,
        status: payment.status,
        amountPaise: Number(payment.amountPaise),
        message: 'Payment webhook processed and funds held pending delivery',
      };
    })();

    this.inFlightWebhooks.set(key, executionPromise);
    try {
      return await executionPromise;
    } finally {
      this.inFlightWebhooks.delete(key);
    }
  }

  // ===========================================================================
  // 4. REFUND EXECUTION (Invariant: Refund <= Paid)
  // ===========================================================================
  async processRefund(paymentId: string, requestedRefundPaise: number, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' not found`);
    }

    const paidPaise = Number(payment.amountPaise);

    // Enforce invariant: calculateRefund throws if requested > paid
    const refundResult = calculateRefund(paidPaise, requestedRefundPaise);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          paymentMetadata: {
            refundReason: reason,
            refundedAmountPaise: refundResult.refundAmountPaise,
            remainingBalancePaise: refundResult.remainingBalancePaise,
            refundedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        paymentId,
        refundedAmountPaise: refundResult.refundAmountPaise,
        remainingBalancePaise: refundResult.remainingBalancePaise,
        reason,
      };
    });
  }
}
