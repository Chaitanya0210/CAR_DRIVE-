import { describe, it, expect } from 'vitest';
import {
  toPaise,
  toRupees,
  formatPaise,
  calculateLandedCost,
  assertValidTransition,
  IllegalStateTransitionError,
  GROUP_TRANSITIONS,
  SELLER_KYB_TRANSITIONS,
  RequestOtpSchema,
  CreateGroupSchema,
} from '../index.js';

describe('Money Utilities (Integer Paise)', () => {
  it('converts rupees to paise accurately without floating point issues', () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(1550000)).toBe(155000000);
    expect(toPaise(19.99)).toBe(1999);
  });

  it('converts paise back to rupees', () => {
    expect(toRupees(155000000)).toBe(1550000);
    expect(toRupees(1999)).toBe(19.99);
  });

  it('formats paise with Indian numbering notation', () => {
    expect(formatPaise(155000000)).toBe('₹15,50,000');
    expect(formatPaise(1999900)).toBe('₹19,999');
    expect(formatPaise(1500000, { includeSymbol: false })).toBe('15,000');
    expect(formatPaise(1999, { showDecimal: true, includeSymbol: true })).toBe('₹19.99');
  });
});

describe('State Machine Transitions', () => {
  it('allows valid group transitions', () => {
    expect(() =>
      assertValidTransition('Group', 'DRAFT', 'FORMING', GROUP_TRANSITIONS),
    ).not.toThrow();

    expect(() =>
      assertValidTransition('Group', 'FORMING', 'QUORUM_REACHED', GROUP_TRANSITIONS),
    ).not.toThrow();
  });

  it('throws IllegalStateTransitionError on forbidden transitions', () => {
    expect(() =>
      assertValidTransition('Group', 'DRAFT', 'COMPLETED', GROUP_TRANSITIONS),
    ).toThrow(IllegalStateTransitionError);

    expect(() =>
      assertValidTransition('Seller', 'REGISTERED', 'ACTIVE', SELLER_KYB_TRANSITIONS),
    ).toThrow(IllegalStateTransitionError);
  });
});

describe('Landed Cost Normalization Engine', () => {
  it('calculates full landed cost including RTO, insurance, logistics, and TCS for > 10L', () => {
    // 12,00,000 INR (120,000,000 paise)
    const result = calculateLandedCost({
      exShowroomPaise: 120000000,
      roadTaxRatePercent: 10, // 10% = 12,000,000 paise
      insuranceEstimatePaise: 4500000, // 45,000 INR
      fastagRegistrationCessPaise: 250000, // 2,500 INR
      dealerLogisticsToZonePaise: 1500000, // 15,000 INR
      batchGroupDiscountPaise: 5000000, // 50,000 INR discount
    });

    expect(result.roadTaxRtoPaise).toBe(12000000);
    expect(result.tcsPaise).toBe(1200000); // 1% TCS since > 10L
    expect(result.totalLandedCostPaise).toBe(
      120000000 + 12000000 + 4500000 + 250000 + 1500000 + 1200000 - 5000000,
    );
  });

  it('does not apply TCS if under 10L', () => {
    // 8,00,000 INR (80,000,000 paise)
    const result = calculateLandedCost({
      exShowroomPaise: 80000000,
      roadTaxRatePercent: 9,
      insuranceEstimatePaise: 3000000,
      fastagRegistrationCessPaise: 200000,
      dealerLogisticsToZonePaise: 1000000,
      batchGroupDiscountPaise: 2500000,
    });

    expect(result.tcsPaise).toBe(0);
  });
});

describe('Zod Validation Schemas', () => {
  it('validates 10-digit Indian mobile numbers', () => {
    expect(RequestOtpSchema.safeParse({ phone: '9876543210' }).success).toBe(true);
    expect(RequestOtpSchema.safeParse({ phone: '1234567890' }).success).toBe(false);
    expect(RequestOtpSchema.safeParse({ phone: 'invalid' }).success).toBe(false);
  });

  it('validates group creation inputs', () => {
    const validGroup = {
      variantId: 'var-123',
      talukaId: 'tal-456',
      pincode: '411001',
      targetBuyers: 5,
      deadlineDays: 7,
    };
    expect(CreateGroupSchema.safeParse(validGroup).success).toBe(true);

    const invalidPincode = { ...validGroup, pincode: '012345' };
    expect(CreateGroupSchema.safeParse(invalidPincode).success).toBe(false);
  });
});
