import { LandedCostBreakdown } from '../types/index.js';
import { roundBasisPoints } from '../money/index.js';

export interface LandedCostInput {
  exShowroomPaise: number;
  roadTaxRatePercent?: number; // e.g. 11.5 for 11.5%
  roadTaxRateBasisPoints?: number; // e.g. 1150 for 11.50% (100 bps = 1.00%)
  fastagRegistrationCessPaise: number;
  insuranceEstimatePaise: number;
  dealerLogisticsToZonePaise: number;
  batchGroupDiscountPaise: number;
  applyTcs?: boolean; // TCS is 1% if ex-showroom > 10,00,000 INR (100,000,000 paise)
}

export type HiddenChargeFlagCode =
  | 'EXCESSIVE_LOGISTICS'
  | 'INFLATED_INSURANCE'
  | 'DOCUMENTATION_FEE_DISGUISE'
  | 'PREDATORY_DISCOUNT_ANOMALY';

export interface HiddenChargeFlag {
  code: HiddenChargeFlagCode;
  severity: 'WARNING' | 'ALERT';
  message: string;
  amountPaise: number;
}

/**
 * Calculates normalized landed cost at the buyer's zone.
 * Everything is computed and stored as integer paise.
 * Zero floating-point arithmetic: uses Basis Points with Half-Up Integer Rounding.
 */
export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  if (input.exShowroomPaise < 0) {
    throw new RangeError('Ex-showroom price cannot be negative');
  }

  // 1. Calculate Road Tax (RTO) in basis points
  // If roadTaxRateBasisPoints is provided (e.g. 1150), use directly;
  // otherwise convert roadTaxRatePercent (e.g. 11.5) to integer bps.
  const rtoBasisPoints =
    input.roadTaxRateBasisPoints !== undefined
      ? input.roadTaxRateBasisPoints
      : Math.round((input.roadTaxRatePercent ?? 0) * 100);

  const roadTaxRtoPaise = roundBasisPoints(input.exShowroomPaise, rtoBasisPoints);

  // 2. TCS under Section 206C(1F) applies if Ex-showroom strictly exceeds 10 Lakhs (100,000,000 paise)
  // TCS rate is exactly 1.00% = 100 basis points
  const isTcsApplicable = input.applyTcs ?? input.exShowroomPaise > 100000000;
  const tcsPaise = isTcsApplicable ? roundBasisPoints(input.exShowroomPaise, 100) : 0;

  // 3. Normalized Sum: ExShowroom + RTO + Insurance + Fastag/Cess + Logistics + TCS - Discount
  const totalLandedCostPaise =
    input.exShowroomPaise +
    roadTaxRtoPaise +
    input.insuranceEstimatePaise +
    input.fastagRegistrationCessPaise +
    input.dealerLogisticsToZonePaise +
    tcsPaise -
    input.batchGroupDiscountPaise;

  return {
    exShowroomPaise: input.exShowroomPaise,
    roadTaxRtoPaise,
    insuranceEstimatePaise: input.insuranceEstimatePaise,
    fastagRegistrationCessPaise: input.fastagRegistrationCessPaise,
    dealerLogisticsToZonePaise: input.dealerLogisticsToZonePaise,
    tcsPaise,
    batchGroupDiscountPaise: input.batchGroupDiscountPaise,
    totalLandedCostPaise: Math.max(0, totalLandedCostPaise),
  };
}

/**
 * Rule-Based Hidden Charges & Fee Inflation Detector.
 * Flags non-standard or disguised dealer markups before buyer voting.
 */
export function detectHiddenCharges(input: LandedCostInput): HiddenChargeFlag[] {
  const flags: HiddenChargeFlag[] = [];

  // Rule 1: High documentation / FASTag cess disguise (> ₹5,000)
  // Statutory RTO smart card + FASTag standard is ~₹2,000-₹3,000. Higher fees indicate hidden dealer handling charges.
  if (input.fastagRegistrationCessPaise > 500000) {
    flags.push({
      code: 'DOCUMENTATION_FEE_DISGUISE',
      severity: 'WARNING',
      message: `Statutory cess/FASTag charge (₹${(input.fastagRegistrationCessPaise / 100).toLocaleString('en-IN')}) exceeds standard ceiling of ₹5,000. Dealership may be disguising prohibited handling charges.`,
      amountPaise: input.fastagRegistrationCessPaise,
    });
  }

  // Rule 2: Inflated Insurance (> 5.0% of ex-showroom)
  // Standard OEM insurance packages range between 2.8% and 4.2% of IDV/Ex-showroom.
  if (input.exShowroomPaise > 0) {
    const insuranceBps = Math.round((input.insuranceEstimatePaise * 10000) / input.exShowroomPaise);
    if (insuranceBps > 500) {
      flags.push({
        code: 'INFLATED_INSURANCE',
        severity: 'WARNING',
        message: `Insurance estimate of ₹${(input.insuranceEstimatePaise / 100).toLocaleString('en-IN')} (${(insuranceBps / 100).toFixed(1)}%) exceeds standard 5.0% market cap.`,
        amountPaise: input.insuranceEstimatePaise,
      });
    }
  }

  // Rule 3: Excessive intra-state logistics (> ₹25,000)
  if (input.dealerLogisticsToZonePaise > 2500000) {
    flags.push({
      code: 'EXCESSIVE_LOGISTICS',
      severity: 'WARNING',
      message: `Logistics and flatbed delivery fee of ₹${(input.dealerLogisticsToZonePaise / 100).toLocaleString('en-IN')} is unusually high for regional delivery cluster.`,
      amountPaise: input.dealerLogisticsToZonePaise,
    });
  }

  // Rule 4: Predatory / unrealistic discount (> 35% of ex-showroom)
  if (input.exShowroomPaise > 0 && input.batchGroupDiscountPaise > 0) {
    const discountBps = Math.round((input.batchGroupDiscountPaise * 10000) / input.exShowroomPaise);
    if (discountBps > 3500) {
      flags.push({
        code: 'PREDATORY_DISCOUNT_ANOMALY',
        severity: 'ALERT',
        message: `Group discount of ${(discountBps / 100).toFixed(1)}% is anomalously high. Verify dealer quote authenticity to avoid bait-and-switch.`,
        amountPaise: input.batchGroupDiscountPaise,
      });
    }
  }

  return flags;
}
