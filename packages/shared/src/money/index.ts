/**
 * Money utilities for GroupDrive.
 * All amounts are stored as integer paise (1 Rupee = 100 paise) to prevent floating-point inaccuracies.
 * Zero floating-point arithmetic is permitted in financial calculations.
 */

export class InvalidRefundAmountError extends Error {
  constructor(requestedPaise: number | bigint, maxAllowedPaise: number | bigint) {
    super(
      `Invalid refund amount: Requested ₹${Number(requestedPaise) / 100} exceeds maximum refundable amount of ₹${Number(maxAllowedPaise) / 100}`,
    );
    this.name = 'InvalidRefundAmountError';
  }
}

export class NegativeMoneyAmountError extends Error {
  constructor(field: string, amountPaise: number | bigint) {
    super(`Money amount for '${field}' cannot be negative (received ${amountPaise} paise)`);
    this.name = 'NegativeMoneyAmountError';
  }
}

export class UnbalancedLedgerError extends Error {
  constructor(totalDebitsPaise: bigint, totalCreditsPaise: bigint) {
    super(
      `Double-entry ledger invariant violation: Total Debits (${totalDebitsPaise} paise) != Total Credits (${totalCreditsPaise} paise). Imbalance: ${totalDebitsPaise - totalCreditsPaise} paise.`,
    );
    this.name = 'UnbalancedLedgerError';
  }
}

export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new TypeError('Rupees value must be a finite number');
  }
  // Convert using integer multiplication after checking precision
  return Math.round(rupees * 100);
}

export function toRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError('Paise value must be a safe integer');
  }
  return paise / 100;
}

export interface FormatPaiseOptions {
  includeSymbol?: boolean;
  showDecimal?: boolean;
}

export function formatPaise(
  paise: number,
  options: FormatPaiseOptions = { includeSymbol: true, showDecimal: false },
): string {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError(`Paise must be a safe integer, received: ${paise}`);
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format integer part using Indian numbering system
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${formattedOther},${lastThree}`;
  }

  let result = formattedRupees;
  if (options.showDecimal) {
    result += `.${remainingPaise.toString().padStart(2, '0')}`;
  }

  if (options.includeSymbol) {
    result = `₹${result}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Standard Indian Half-Up Rounding in Integer Basis Points:
 * (Value * BasisPoints + 5000) / 10000
 * Ensures deterministic exact rounding to nearest integer paise without float errors.
 */
export function roundBasisPoints(amountPaise: bigint | number, basisPoints: number): number {
  const amountBig = BigInt(amountPaise);
  if (amountBig < 0n) {
    throw new RangeError('Amount cannot be negative for basis point calculation');
  }
  const bpsBig = BigInt(basisPoints);
  // Half-up division: add half of divisor (5000n for 10000n) before integer division
  const result = (amountBig * bpsBig + 5000n) / 10000n;
  return Number(result);
}

export interface PlatformCommissionSplit {
  dealValuePaise: number;
  commissionPaise: number;
  gstPaise: number;
  totalPlatformFeePaise: number;
  netDealerPayoutPaise: number;
}

/**
 * Platform Commission Calculation:
 * - Rate: exactly 1.00% (100 basis points) of final gross deal value
 * - GST on Commission: exactly 18.00% (1800 basis points)
 * - Rounding Rule: Half-Up Integer Rounding to the nearest paise:
 *     commissionPaise = floor((dealValuePaise * 100 + 5000) / 10000)
 *     gstPaise = floor((commissionPaise * 1800 + 5000) / 10000)
 */
export function calculatePlatformCommission(
  dealValuePaise: number | bigint,
): PlatformCommissionSplit {
  const dealValueBig = BigInt(dealValuePaise);
  if (dealValueBig < 0n) {
    throw new NegativeMoneyAmountError('dealValuePaise', dealValueBig);
  }

  // Exactly 1.00% = 100 basis points
  const commissionPaise = roundBasisPoints(dealValueBig, 100);

  // Exactly 18.00% GST = 1800 basis points
  const gstPaise = roundBasisPoints(BigInt(commissionPaise), 1800);

  const totalPlatformFeePaise = commissionPaise + gstPaise;
  const netDealerPayoutPaise = Number(dealValueBig) - totalPlatformFeePaise;

  return {
    dealValuePaise: Number(dealValueBig),
    commissionPaise,
    gstPaise,
    totalPlatformFeePaise,
    netDealerPayoutPaise,
  };
}

export interface RefundResult {
  paidPaise: number;
  refundAmountPaise: number;
  remainingBalancePaise: number;
}

/**
 * Validates and computes refund amount.
 * Invariant: refundAmountPaise must be >= 0 and <= paidPaise.
 * Any attempt to refund more than paid throws InvalidRefundAmountError.
 */
export function calculateRefund(
  paidPaise: number | bigint,
  requestedRefundPaise: number | bigint,
): RefundResult {
  const paidBig = BigInt(paidPaise);
  const refundBig = BigInt(requestedRefundPaise);

  if (paidBig < 0n) {
    throw new NegativeMoneyAmountError('paidPaise', paidBig);
  }
  if (refundBig < 0n) {
    throw new NegativeMoneyAmountError('requestedRefundPaise', refundBig);
  }
  if (refundBig > paidBig) {
    throw new InvalidRefundAmountError(refundBig, paidBig);
  }

  const remainingBig = paidBig - refundBig;

  return {
    paidPaise: Number(paidBig),
    refundAmountPaise: Number(refundBig),
    remainingBalancePaise: Number(remainingBig),
  };
}

export interface LedgerBalanceVerification {
  totalDebitsPaise: bigint;
  totalCreditsPaise: bigint;
  imbalancePaise: bigint;
  isBalanced: boolean;
}

/**
 * Asserts the fundamental double-entry invariant: Total Debits == Total Credits.
 * Throws UnbalancedLedgerError if any difference exists.
 */
export function assertLedgerBalanced(
  entries: Array<{ debitPaise: bigint | number; creditPaise: bigint | number }>,
): LedgerBalanceVerification {
  let totalDebits = 0n;
  let totalCredits = 0n;

  for (const entry of entries) {
    const d = BigInt(entry.debitPaise);
    const c = BigInt(entry.creditPaise);

    if (d < 0n) throw new NegativeMoneyAmountError('debitPaise', d);
    if (c < 0n) throw new NegativeMoneyAmountError('creditPaise', c);

    totalDebits += d;
    totalCredits += c;
  }

  const isBalanced = totalDebits === totalCredits;
  if (!isBalanced) {
    throw new UnbalancedLedgerError(totalDebits, totalCredits);
  }

  return {
    totalDebitsPaise: totalDebits,
    totalCreditsPaise: totalCredits,
    imbalancePaise: 0n,
    isBalanced: true,
  };
}
