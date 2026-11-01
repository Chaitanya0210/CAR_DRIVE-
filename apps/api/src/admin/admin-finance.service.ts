import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FinanceSummary {
  registrationFees: {
    totalCollectedPaise: string;
    totalCollectedInr: number;
    paidCount: number;
    pendingCount: number;
    standardFeeInr: number;
  };
  commissions: {
    totalCommissionPaise: string;
    totalCommissionInr: number;
    pendingCommissionPaise: string;
    settledCommissionPaise: string;
    ratePercent: number;
  };
  settlements: {
    totalSettlementsCount: number;
    pendingCount: number;
    processedCount: number;
    disputedCount: number;
  };
  ledger: {
    totalEntriesCount: number;
    latestBalancePaise: string;
    latestBalanceInr: number;
  };
}

@Injectable()
export class AdminFinanceService {
  constructor(private prisma: PrismaService = new PrismaService()) {}

  async getFinanceSummary(): Promise<FinanceSummary> {
    // 1. Seller registration fees (Rs 19,999 + GST = 23,598.82)
    const paidFees = await this.prisma.sellerRegistrationPayment.findMany({
      where: { status: 'CAPTURED' },
    });
    const pendingFeesCount = await this.prisma.sellerRegistrationPayment.count({
      where: { status: 'PENDING' },
    });

    const totalCollectedPaise = paidFees.reduce(
      (sum, p) => sum + BigInt(p.totalAmountPaise.toString()),
      BigInt(0),
    );

    // 2. Platform 1% commissions and settlements
    const settlements = await this.prisma.settlement.findMany();
    const settledSettlements = settlements.filter((s) => s.status === 'PROCESSED');
    const pendingSettlements = settlements.filter((s) => s.status === 'PENDING');
    const disputedSettlements = settlements.filter((s) => s.status === 'DISPUTED');

    const totalCommissionPaise = settlements.reduce(
      (sum, s) => sum + BigInt(s.platformCommissionPaise.toString()),
      BigInt(0),
    );
    const settledCommissionPaise = settledSettlements.reduce(
      (sum, s) => sum + BigInt(s.platformCommissionPaise.toString()),
      BigInt(0),
    );
    const pendingCommissionPaise = pendingSettlements.reduce(
      (sum, s) => sum + BigInt(s.platformCommissionPaise.toString()),
      BigInt(0),
    );

    // 3. Ledger balances
    const totalEntriesCount = await this.prisma.ledgerEntry.count();
    const latestEntry = await this.prisma.ledgerEntry.findFirst({
      orderBy: { entryNumber: 'desc' },
    });
    const latestBalancePaise = latestEntry ? latestEntry.balanceAfterPaise.toString() : '0';

    return {
      registrationFees: {
        totalCollectedPaise: totalCollectedPaise.toString(),
        totalCollectedInr: Number(totalCollectedPaise) / 100,
        paidCount: paidFees.length,
        pendingCount: pendingFeesCount,
        standardFeeInr: 19999,
      },
      commissions: {
        totalCommissionPaise: totalCommissionPaise.toString(),
        totalCommissionInr: Number(totalCommissionPaise) / 100,
        pendingCommissionPaise: pendingCommissionPaise.toString(),
        settledCommissionPaise: settledCommissionPaise.toString(),
        ratePercent: 1.0,
      },
      settlements: {
        totalSettlementsCount: settlements.length,
        pendingCount: pendingSettlements.length,
        processedCount: settledSettlements.length,
        disputedCount: disputedSettlements.length,
      },
      ledger: {
        totalEntriesCount,
        latestBalancePaise,
        latestBalanceInr: Number(latestBalancePaise) / 100,
      },
    };
  }

  async getLedgerEntries(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const entries = await this.prisma.ledgerEntry.findMany({
      skip,
      take: pageSize,
      orderBy: { entryNumber: 'desc' },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            totalOnRoadPaise: true,
          },
        },
      },
    });
    const total = await this.prisma.ledgerEntry.count();

    return {
      data: entries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entryNumber,
        accountType: entry.accountType,
        bookingId: entry.bookingId,
        bookingReference: entry.booking?.bookingNumber || null,
        debitPaise: entry.debitPaise.toString(),
        creditPaise: entry.creditPaise.toString(),
        balanceAfterPaise: entry.balanceAfterPaise.toString(),
        debitInr: Number(entry.debitPaise) / 100,
        creditInr: Number(entry.creditPaise) / 100,
        balanceAfterInr: Number(entry.balanceAfterPaise) / 100,
        narration: entry.narration,
        createdAt: entry.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async exportLedgerCsv(): Promise<string> {
    const entries = await this.prisma.ledgerEntry.findMany({
      orderBy: { entryNumber: 'asc' },
      include: {
        booking: {
          select: {
            bookingNumber: true,
          },
        },
      },
    });

    const headers = [
      'Entry Number',
      'Account Type',
      'Debit (INR)',
      'Credit (INR)',
      'Balance After (INR)',
      'Narration',
      'Booking Reference',
      'Created At (UTC)',
    ];

    const escapeCsv = (str: string | number | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const value = String(str).replace(/"/g, '""');
      return `"${value}"`;
    };

    const rows = entries.map((e) => [
      e.entryNumber,
      e.accountType,
      (Number(e.debitPaise) / 100).toFixed(2),
      (Number(e.creditPaise) / 100).toFixed(2),
      (Number(e.balanceAfterPaise) / 100).toFixed(2),
      escapeCsv(e.narration),
      escapeCsv(e.booking?.bookingNumber || 'N/A'),
      e.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  }
}
