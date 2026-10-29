import { LandedCostBreakdown } from '../types/index.js';

export interface LandedCostInput {
  exShowroomPaise: number;
  roadTaxRatePercent: number; // e.g. 11.5 for 11.5%
  fastagRegistrationCessPaise: number;
  insuranceEstimatePaise: number;
  dealerLogisticsToZonePaise: number;
  batchGroupDiscountPaise: number;
  applyTcs?: boolean; // TCS is 1% if ex-showroom > 10,00,000 INR (100,000,000 paise)
}

/**
 * Calculates normalized landed cost at the buyer's zone.
 * Everything is computed and stored as integer paise.
 */
export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  if (input.exShowroomPaise < 0) {
    throw new RangeError('Ex-showroom price cannot be negative');
  }

  // 1. Calculate Road Tax (RTO)
  const roadTaxRtoPaise = Math.round(
    (input.exShowroomPaise * input.roadTaxRatePercent) / 100,
  );

  // 2. TCS under Section 206C(1F) applies if Ex-showroom exceeds 10 Lakhs (100,000,000 paise)
  const isTcsApplicable =
    input.applyTcs ?? input.exShowroomPaise > 100000000;
  const tcsPaise = isTcsApplicable
    ? Math.round((input.exShowroomPaise * 1) / 100)
    : 0;

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
