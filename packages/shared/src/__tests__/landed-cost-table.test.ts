import { describe, it, expect } from 'vitest';
import { calculateLandedCost, detectHiddenCharges, LandedCostInput } from '../landed-cost/index.js';

interface LandedCostTestCase {
  id: string;
  name: string;
  description: string;
  stateCode: string;
  fuelType: 'PETROL' | 'DIESEL' | 'EV' | 'CNG';
  input: LandedCostInput;
  expected: {
    roadTaxRtoPaise: number;
    insuranceEstimatePaise: number;
    fastagRegistrationCessPaise: number;
    dealerLogisticsToZonePaise: number;
    tcsPaise: number;
    batchGroupDiscountPaise: number;
    totalLandedCostPaise: number;
  };
}

/**
 * 11 Worked Examples Table-Driven Test Matrix:
 * Validates on-road landed cost normalization across diverse geographic zones,
 * fuel categories, and TCS statutory thresholds.
 */
export const LANDED_COST_TEST_CASES: LandedCostTestCase[] = [
  {
    id: 'CASE-01',
    name: 'In-State Maharashtra Petrol (< ₹10L, No TCS)',
    description: 'Compact SUV in Pune cluster, standard 11% RTO, below 10L threshold',
    stateCode: 'MH',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 85000000, // ₹8,50,000
      roadTaxRateBasisPoints: 1100, // 11.00%
      fastagRegistrationCessPaise: 250000, // ₹2,500
      insuranceEstimatePaise: 2975000, // ₹29,750 (3.5%)
      dealerLogisticsToZonePaise: 500000, // ₹5,000
      batchGroupDiscountPaise: 3000000, // ₹30,000
    },
    expected: {
      roadTaxRtoPaise: 9350000, // 85,00,000 * 11% = ₹93,500
      insuranceEstimatePaise: 2975000,
      fastagRegistrationCessPaise: 250000,
      dealerLogisticsToZonePaise: 500000,
      tcsPaise: 0, // <= 10L
      batchGroupDiscountPaise: 3000000,
      totalLandedCostPaise: 95075000, // ₹9,50,750
    },
  },
  {
    id: 'CASE-02',
    name: 'In-State Maharashtra Diesel (> ₹10L, With TCS)',
    description: 'Mid-size SUV in Baramati cluster, 13% Diesel RTO, TCS 1% under 206C(1F)',
    stateCode: 'MH',
    fuelType: 'DIESEL',
    input: {
      exShowroomPaise: 145000000, // ₹14,50,000
      roadTaxRateBasisPoints: 1300, // 13.00%
      fastagRegistrationCessPaise: 250000, // ₹2,500
      insuranceEstimatePaise: 5000000, // ₹50,000
      dealerLogisticsToZonePaise: 800000, // ₹8,000
      batchGroupDiscountPaise: 6500000, // ₹65,000
    },
    expected: {
      roadTaxRtoPaise: 18850000, // 14,50,000 * 13% = ₹1,88,500
      insuranceEstimatePaise: 5000000,
      fastagRegistrationCessPaise: 250000,
      dealerLogisticsToZonePaise: 800000,
      tcsPaise: 1450000, // 1% = ₹14,500
      batchGroupDiscountPaise: 6500000,
      totalLandedCostPaise: 164850000, // ₹16,48,500
    },
  },
  {
    id: 'CASE-03',
    name: 'In-State Maharashtra EV (> ₹10L, With TCS, 0% RTO)',
    description: 'Electric SUV with Maharashtra state zero-road-tax policy',
    stateCode: 'MH',
    fuelType: 'EV',
    input: {
      exShowroomPaise: 150000000, // ₹15,00,000
      roadTaxRateBasisPoints: 0, // 0.00%
      fastagRegistrationCessPaise: 250000, // ₹2,500
      insuranceEstimatePaise: 4800000, // ₹48,000
      dealerLogisticsToZonePaise: 600000, // ₹6,000
      batchGroupDiscountPaise: 5000000, // ₹50,000
    },
    expected: {
      roadTaxRtoPaise: 0, // Zero RTO for EV
      insuranceEstimatePaise: 4800000,
      fastagRegistrationCessPaise: 250000,
      dealerLogisticsToZonePaise: 600000,
      tcsPaise: 1500000, // 1% = ₹15,000
      batchGroupDiscountPaise: 5000000,
      totalLandedCostPaise: 152150000, // ₹15,21,500
    },
  },
  {
    id: 'CASE-04',
    name: 'In-State Maharashtra CNG (< ₹10L, No TCS)',
    description: 'Factory-fitted CNG sedan, concessionary 7% road tax rate',
    stateCode: 'MH',
    fuelType: 'CNG',
    input: {
      exShowroomPaise: 78000000, // ₹7,80,000
      roadTaxRateBasisPoints: 700, // 7.00%
      fastagRegistrationCessPaise: 200000, // ₹2,000
      insuranceEstimatePaise: 2800000, // ₹28,000
      dealerLogisticsToZonePaise: 400000, // ₹4,000
      batchGroupDiscountPaise: 2500000, // ₹25,000
    },
    expected: {
      roadTaxRtoPaise: 5460000, // 7% of 780000 = ₹54,600
      insuranceEstimatePaise: 2800000,
      fastagRegistrationCessPaise: 200000,
      dealerLogisticsToZonePaise: 400000,
      tcsPaise: 0,
      batchGroupDiscountPaise: 2500000,
      totalLandedCostPaise: 84360000, // ₹8,43,600
    },
  },
  {
    id: 'CASE-05',
    name: 'Out-of-State Madhya Pradesh Petrol (< ₹10L, No TCS)',
    description: 'Indore/Depalpur cluster, 9% MP road tax, interstate carrier freight',
    stateCode: 'MP',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 92000000, // ₹9,20,000
      roadTaxRateBasisPoints: 900, // 9.00%
      fastagRegistrationCessPaise: 300000, // ₹3,000
      insuranceEstimatePaise: 3200000, // ₹32,000
      dealerLogisticsToZonePaise: 1800000, // ₹18,000 interstate logistics
      batchGroupDiscountPaise: 4000000, // ₹40,000
    },
    expected: {
      roadTaxRtoPaise: 8280000, // 9% of 920000 = ₹82,800
      insuranceEstimatePaise: 3200000,
      fastagRegistrationCessPaise: 300000,
      dealerLogisticsToZonePaise: 1800000,
      tcsPaise: 0,
      batchGroupDiscountPaise: 4000000,
      totalLandedCostPaise: 101580000, // ₹10,15,800
    },
  },
  {
    id: 'CASE-06',
    name: 'Out-of-State Madhya Pradesh Diesel (> ₹10L, With TCS)',
    description: 'Bhopal cluster, 10% MP diesel tax, TCS 1% applied',
    stateCode: 'MP',
    fuelType: 'DIESEL',
    input: {
      exShowroomPaise: 160000000, // ₹16,00,000
      roadTaxRateBasisPoints: 1000, // 10.00%
      fastagRegistrationCessPaise: 300000, // ₹3,000
      insuranceEstimatePaise: 5500000, // ₹55,000
      dealerLogisticsToZonePaise: 2200000, // ₹22,000
      batchGroupDiscountPaise: 7000000, // ₹70,000
    },
    expected: {
      roadTaxRtoPaise: 16000000, // 10% of 16L = ₹1,60,000
      insuranceEstimatePaise: 5500000,
      fastagRegistrationCessPaise: 300000,
      dealerLogisticsToZonePaise: 2200000,
      tcsPaise: 1600000, // 1% = ₹16,000
      batchGroupDiscountPaise: 7000000,
      totalLandedCostPaise: 178600000, // ₹17,86,000
    },
  },
  {
    id: 'CASE-07',
    name: 'Out-of-State Karnataka Petrol (> ₹10L, With TCS)',
    description: 'Bengaluru/Belagavi cluster, 14% high-tax slab in KA',
    stateCode: 'KA',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 135000000, // ₹13,50,000
      roadTaxRateBasisPoints: 1400, // 14.00%
      fastagRegistrationCessPaise: 300000, // ₹3,000
      insuranceEstimatePaise: 4600000, // ₹46,000
      dealerLogisticsToZonePaise: 1500000, // ₹15,000
      batchGroupDiscountPaise: 5500000, // ₹55,000
    },
    expected: {
      roadTaxRtoPaise: 18900000, // 14% of 13.5L = ₹1,89,000
      insuranceEstimatePaise: 4600000,
      fastagRegistrationCessPaise: 300000,
      dealerLogisticsToZonePaise: 1500000,
      tcsPaise: 1350000, // 1% = ₹13,500
      batchGroupDiscountPaise: 5500000,
      totalLandedCostPaise: 156150000, // ₹15,61,500
    },
  },
  {
    id: 'CASE-08',
    name: 'High-Discount Clearance Stock (> ₹10L, With TCS)',
    description: 'Year-end inventory clearance with aggressive ₹1.8L group discount',
    stateCode: 'MH',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 120000000, // ₹12,00,000
      roadTaxRateBasisPoints: 1100, // 11.00%
      fastagRegistrationCessPaise: 250000, // ₹2,500
      insuranceEstimatePaise: 4000000, // ₹40,000
      dealerLogisticsToZonePaise: 1000000, // ₹10,000
      batchGroupDiscountPaise: 18000000, // ₹1,80,000 discount
    },
    expected: {
      roadTaxRtoPaise: 13200000, // 11% of 12L = ₹1,32,000
      insuranceEstimatePaise: 4000000,
      fastagRegistrationCessPaise: 250000,
      dealerLogisticsToZonePaise: 1000000,
      tcsPaise: 1200000, // 1% of 12L = ₹12,000
      batchGroupDiscountPaise: 18000000,
      totalLandedCostPaise: 121650000, // ₹12,16,500
    },
  },
  {
    id: 'CASE-09',
    name: 'Zero-Logistics Dealership Local Pickup (< ₹10L, No TCS)',
    description: 'Buyer self-collection from dealer yard in Baramati',
    stateCode: 'MH',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 65000000, // ₹6,50,000
      roadTaxRateBasisPoints: 1100, // 11.00%
      fastagRegistrationCessPaise: 200000, // ₹2,000
      insuranceEstimatePaise: 2400000, // ₹24,000
      dealerLogisticsToZonePaise: 0, // Self-pickup
      batchGroupDiscountPaise: 2000000, // ₹20,000
    },
    expected: {
      roadTaxRtoPaise: 7150000, // 11% of 6.5L = ₹71,500
      insuranceEstimatePaise: 2400000,
      fastagRegistrationCessPaise: 200000,
      dealerLogisticsToZonePaise: 0,
      tcsPaise: 0,
      batchGroupDiscountPaise: 2000000,
      totalLandedCostPaise: 72750000, // ₹7,27,500
    },
  },
  {
    id: 'CASE-10',
    name: 'Deep Rural Destination with Subsidized Freight (< ₹10L, No TCS)',
    description: 'Hilly terrain delivery to remote taluka with full flatbed carrier',
    stateCode: 'MH',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 59900000, // ₹5,99,000
      roadTaxRateBasisPoints: 1100, // 11.00%
      fastagRegistrationCessPaise: 200000, // ₹2,000
      insuranceEstimatePaise: 2200000, // ₹22,000
      dealerLogisticsToZonePaise: 2500000, // ₹25,000
      batchGroupDiscountPaise: 1500000, // ₹15,000
    },
    expected: {
      roadTaxRtoPaise: 6589000, // 11% of 5,99,000 = ₹65,890
      insuranceEstimatePaise: 2200000,
      fastagRegistrationCessPaise: 200000,
      dealerLogisticsToZonePaise: 2500000,
      tcsPaise: 0,
      batchGroupDiscountPaise: 1500000,
      totalLandedCostPaise: 69889000, // ₹6,98,890
    },
  },
  {
    id: 'CASE-11',
    name: 'TCS Boundary Test: Exactly ₹10,00,000 Ex-Showroom (Threshold Boundary)',
    description:
      'Section 206C(1F) specifies "exceeding ten lakh rupees". Exactly 10L does NOT trigger TCS.',
    stateCode: 'MH',
    fuelType: 'PETROL',
    input: {
      exShowroomPaise: 100000000, // Exactly ₹10,00,000
      roadTaxRateBasisPoints: 1100, // 11%
      fastagRegistrationCessPaise: 250000, // ₹2,500
      insuranceEstimatePaise: 3500000, // ₹35,000
      dealerLogisticsToZonePaise: 500000, // ₹5,000
      batchGroupDiscountPaise: 3000000, // ₹30,000
    },
    expected: {
      roadTaxRtoPaise: 11000000, // ₹1,10,000
      insuranceEstimatePaise: 3500000,
      fastagRegistrationCessPaise: 250000,
      dealerLogisticsToZonePaise: 500000,
      tcsPaise: 0, // Boundary: <= 10L -> 0 paise TCS
      batchGroupDiscountPaise: 3000000,
      totalLandedCostPaise: 112250000, // ₹11,22,500
    },
  },
];

describe('Table-Driven Landed Cost Suite (11 Worked Examples)', () => {
  LANDED_COST_TEST_CASES.forEach((tc) => {
    it(`[${tc.id}] ${tc.name}`, () => {
      const result = calculateLandedCost(tc.input);

      expect(result.exShowroomPaise).toBe(tc.input.exShowroomPaise);
      expect(result.roadTaxRtoPaise).toBe(tc.expected.roadTaxRtoPaise);
      expect(result.insuranceEstimatePaise).toBe(tc.expected.insuranceEstimatePaise);
      expect(result.fastagRegistrationCessPaise).toBe(tc.expected.fastagRegistrationCessPaise);
      expect(result.dealerLogisticsToZonePaise).toBe(tc.expected.dealerLogisticsToZonePaise);
      expect(result.tcsPaise).toBe(tc.expected.tcsPaise);
      expect(result.batchGroupDiscountPaise).toBe(tc.expected.batchGroupDiscountPaise);
      expect(result.totalLandedCostPaise).toBe(tc.expected.totalLandedCostPaise);
    });
  });

  it('verifies TCS triggers at ₹10,00,001 (exceeds ₹10L by 1 Rupee)', () => {
    const result = calculateLandedCost({
      exShowroomPaise: 100000100, // ₹10,00,001 (100,000,100 paise)
      roadTaxRateBasisPoints: 1000,
      fastagRegistrationCessPaise: 250000,
      insuranceEstimatePaise: 3500000,
      dealerLogisticsToZonePaise: 500000,
      batchGroupDiscountPaise: 0,
    });

    // 1% of 100000100 is roundBasisPoints(100000100, 100) = 1000001 paise (₹10,000.01)
    expect(result.tcsPaise).toBe(1000001);
  });

  describe('Hidden Charges & Fee Anomaly Detector', () => {
    it('flags documentation fee disguise when FASTag/cess > ₹5,000', () => {
      const flags = detectHiddenCharges({
        exShowroomPaise: 100000000,
        fastagRegistrationCessPaise: 800000, // ₹8,000 cess (inflated)
        insuranceEstimatePaise: 3500000,
        dealerLogisticsToZonePaise: 500000,
        batchGroupDiscountPaise: 2000000,
      });

      expect(flags.some((f) => f.code === 'DOCUMENTATION_FEE_DISGUISE')).toBe(true);
    });

    it('flags inflated insurance when rate > 5.0%', () => {
      const flags = detectHiddenCharges({
        exShowroomPaise: 100000000, // ₹10L
        fastagRegistrationCessPaise: 250000,
        insuranceEstimatePaise: 6500000, // ₹65,000 = 6.5% of ex-showroom
        dealerLogisticsToZonePaise: 500000,
        batchGroupDiscountPaise: 2000000,
      });

      expect(flags.some((f) => f.code === 'INFLATED_INSURANCE')).toBe(true);
    });

    it('flags excessive logistics when freight > ₹25,000', () => {
      const flags = detectHiddenCharges({
        exShowroomPaise: 100000000,
        fastagRegistrationCessPaise: 250000,
        insuranceEstimatePaise: 3500000,
        dealerLogisticsToZonePaise: 3500000, // ₹35,000 logistics
        batchGroupDiscountPaise: 2000000,
      });

      expect(flags.some((f) => f.code === 'EXCESSIVE_LOGISTICS')).toBe(true);
    });

    it('flags predatory discount anomaly when discount > 35%', () => {
      const flags = detectHiddenCharges({
        exShowroomPaise: 100000000, // ₹10L
        fastagRegistrationCessPaise: 250000,
        insuranceEstimatePaise: 3500000,
        dealerLogisticsToZonePaise: 500000,
        batchGroupDiscountPaise: 40000000, // ₹4L = 40% discount
      });

      expect(flags.some((f) => f.code === 'PREDATORY_DISCOUNT_ANOMALY')).toBe(true);
    });
  });
});
