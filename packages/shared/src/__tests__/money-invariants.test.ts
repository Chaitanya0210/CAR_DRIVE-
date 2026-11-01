import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  calculatePlatformCommission,
  calculateRefund,
  assertLedgerBalanced,
  InvalidRefundAmountError,
  NegativeMoneyAmountError,
  UnbalancedLedgerError,
} from '../money/index.js';

describe('Financial Invariants & Accounting Rules', () => {
  // ===========================================================================
  // 1. Commission is exactly 1% rounded half-up
  // ===========================================================================
  describe('Commission Calculation Invariant (1.00% + 18% GST Half-Up)', () => {
    it('computes exactly 1% of round numbers without drift', () => {
      // Deal value = ₹15,00,000 (150,000,000 paise)
      const split = calculatePlatformCommission(150000000);
      expect(split.commissionPaise).toBe(1500000); // ₹15,000
      expect(split.gstPaise).toBe(270000); // 18% GST of 1500000 = ₹2,700
      expect(split.totalPlatformFeePaise).toBe(1770000); // ₹17,700
      expect(split.netDealerPayoutPaise).toBe(150000000 - 1770000);
      expect(split.dealValuePaise).toBe(
        split.netDealerPayoutPaise + split.commissionPaise + split.gstPaise,
      );
    });

    it('enforces deterministic half-up rounding on fractional paise amounts', () => {
      // ₹12,345.67 = 1,234,567 paise
      // 1% = 12,345.67 paise -> Half-Up rounds to 12,346 paise
      const split = calculatePlatformCommission(1234567);
      expect(split.commissionPaise).toBe(12346);

      // 18% GST on 12,346 paise = 2,222.28 paise -> Half-Up rounds to 2,222 paise
      expect(split.gstPaise).toBe(2222);
      expect(split.totalPlatformFeePaise).toBe(12346 + 2222);
      expect(split.netDealerPayoutPaise).toBe(1234567 - 14568);

      // Perfect conservation of value
      expect(split.dealValuePaise).toBe(
        split.netDealerPayoutPaise + split.commissionPaise + split.gstPaise,
      );
    });

    it('rejects negative deal values', () => {
      expect(() => calculatePlatformCommission(-100)).toThrow(NegativeMoneyAmountError);
    });
  });

  // ===========================================================================
  // 2. Double-Entry Balance Invariant: Total Debits == Total Credits
  // ===========================================================================
  describe('Double-Entry Balance Invariant (Debits == Credits)', () => {
    it('verifies balanced transaction vouchers pass verification', () => {
      // Example 1: ₹25,000 Buyer Escrow Deposit Voucher
      const depositVoucher = [
        { debitPaise: 2500000, creditPaise: 0 }, // BUYER_ESCROW_HOLD
        { debitPaise: 0, creditPaise: 2500000 }, // SELLER_RECEIVABLE (held)
      ];
      expect(assertLedgerBalanced(depositVoucher).isBalanced).toBe(true);

      // Example 2: Final Deal Settlement Voucher (Deal Value ₹15,00,000)
      const settlementVoucher = [
        { debitPaise: 150000000, creditPaise: 0 }, // Escrow release
        { debitPaise: 0, creditPaise: 148230000 }, // SELLER_RECEIVABLE payout
        { debitPaise: 0, creditPaise: 1500000 }, // PLATFORM_REVENUE (1%)
        { debitPaise: 0, creditPaise: 270000 }, // TAX_PAYABLE (18% GST)
      ];
      const result = assertLedgerBalanced(settlementVoucher);
      expect(result.isBalanced).toBe(true);
      expect(result.totalDebitsPaise).toBe(150000000n);
      expect(result.totalCreditsPaise).toBe(150000000n);
    });

    it('throws UnbalancedLedgerError if debits do not match credits', () => {
      const corruptVoucher = [
        { debitPaise: 2500000, creditPaise: 0 },
        { debitPaise: 0, creditPaise: 2400000 }, // 100,000 paise missing!
      ];
      expect(() => assertLedgerBalanced(corruptVoucher)).toThrow(UnbalancedLedgerError);
    });

    it('rejects negative debit or credit entries', () => {
      const invalidVoucher = [
        { debitPaise: -500, creditPaise: 0 },
        { debitPaise: 0, creditPaise: -500 },
      ];
      expect(() => assertLedgerBalanced(invalidVoucher)).toThrow(NegativeMoneyAmountError);
    });
  });

  // ===========================================================================
  // 3. Refunds Never Exceed Paid Amounts
  // ===========================================================================
  describe('Refund Capping & Balance Invariant', () => {
    it('allows full refund of paid amount', () => {
      const result = calculateRefund(2500000, 2500000);
      expect(result.refundAmountPaise).toBe(2500000);
      expect(result.remainingBalancePaise).toBe(0);
    });

    it('allows partial refund of paid amount', () => {
      const result = calculateRefund(2500000, 1000000);
      expect(result.refundAmountPaise).toBe(1000000);
      expect(result.remainingBalancePaise).toBe(1500000);
    });

    it('throws InvalidRefundAmountError when refund request exceeds paid amount', () => {
      expect(() => calculateRefund(2500000, 2500001)).toThrow(InvalidRefundAmountError);
      expect(() => calculateRefund(10000, 50000)).toThrow(InvalidRefundAmountError);
    });

    it('rejects negative refund requests', () => {
      expect(() => calculateRefund(2500000, -100)).toThrow(NegativeMoneyAmountError);
    });
  });

  // ===========================================================================
  // 4. Automated Grep Test: Zero Float Math in Money-Touching Paths
  // ===========================================================================
  describe('Static Analysis Invariant: Zero Float Math in Money Paths', () => {
    it('verifies no floating point multiplier (* 0.xx) exists in money packages', () => {
      const filesToAudit = [
        path.resolve(__dirname, '../money/index.ts'),
        path.resolve(__dirname, '../landed-cost/index.ts'),
        path.resolve(__dirname, '../../../../apps/mcp-server/src/tools/buyer/calculate-price.ts'),
        path.resolve(__dirname, '../../../../apps/mcp-server/src/tools/seller/draft-quote.ts'),
        path.resolve(__dirname, '../../../../apps/ai-service/app/nlp/quote_parser.py'),
      ];

      const forbiddenPatterns = [
        /\*\s*0\.01\b/, // float 1% multiplier
        /\*\s*0\.18\b/, // float 18% GST multiplier
        /\*\s*0\.035\b/, // float 3.5% insurance multiplier
        /\*\s*0\.04\b/, // float 4% multiplier
        /\*\s*0\.12\b/, // float 12% multiplier
      ];

      for (const filePath of filesToAudit) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of forbiddenPatterns) {
          const match = content.match(pattern);
          expect(
            match,
            `Prohibited floating-point multiplier '${pattern}' found in ${path.basename(filePath)}! Money calculations must use integer basis points or BigInt.`,
          ).toBeNull();
        }
      }
    });
  });
});
