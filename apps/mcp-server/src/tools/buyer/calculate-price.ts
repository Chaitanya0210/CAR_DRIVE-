import { z } from 'zod';
import { AuthContext } from '../../auth/tokens.js';
import { calculateLandedCost, roundBasisPoints } from '@groupdrive/shared';

export const calculateOnRoadPriceSchema = z.object({
  ex_showroom_paise: z
    .number()
    .int()
    .min(10000000)
    .describe('Vehicle ex-showroom price in integer paise (e.g. 120000000 for ₹12L)'),
  state_code: z
    .string()
    .default('MH')
    .describe('Indian State code (e.g. MH for Maharashtra, MP for Madhya Pradesh)'),
  fuel_type: z
    .enum(['PETROL', 'DIESEL', 'CNG', 'EV'])
    .default('DIESEL')
    .describe('Fuel type for tax calculations'),
  engine_cc: z
    .number()
    .int()
    .optional()
    .describe('Engine capacity in CC (affects road tax brackets)'),
  is_ev: z.boolean().optional().describe('Whether vehicle is electric (often 0% or reduced RTO)'),
  logistics_paise: z
    .number()
    .int()
    .default(500000)
    .describe('Doorstep transit logistics in paise (default ₹5,000)'),
});

export type CalculateOnRoadPriceInput = z.infer<typeof calculateOnRoadPriceSchema>;

export async function handleCalculateOnRoadPrice(
  params: CalculateOnRoadPriceInput,
  _auth: AuthContext,
) {
  // Road tax determination by state & fuel
  let taxRatePercent = 11.5; // default MH Diesel/Petrol
  if (params.is_ev || params.fuel_type === 'EV') {
    taxRatePercent = 0.0; // 0% RTO for EV in Maharashtra
  } else if (params.fuel_type === 'CNG') {
    taxRatePercent = 7.0; // Reduced tax for CNG
  } else if (params.fuel_type === 'DIESEL') {
    taxRatePercent = params.state_code.toUpperCase() === 'MP' ? 10.0 : 12.0;
  } else {
    taxRatePercent = params.state_code.toUpperCase() === 'MP' ? 9.0 : 11.0;
  }

  const insuranceEstimatePaise = roundBasisPoints(params.ex_showroom_paise, 350);
  const fastagRegCessPaise = 250000; // ₹2,500

  const landed = calculateLandedCost({
    exShowroomPaise: params.ex_showroom_paise,
    roadTaxRatePercent: taxRatePercent,
    fastagRegistrationCessPaise: fastagRegCessPaise,
    insuranceEstimatePaise,
    dealerLogisticsToZonePaise: params.logistics_paise,
    batchGroupDiscountPaise: 0,
  });

  return {
    state_code: params.state_code.toUpperCase(),
    fuel_type: params.fuel_type,
    tax_rate_applied_percent: taxRatePercent,
    line_items: {
      ex_showroom_inr: (params.ex_showroom_paise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      road_tax_rto_inr: (landed.roadTaxRtoPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      insurance_estimate_inr: (landed.insuranceEstimatePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      fastag_cess_inr: (landed.fastagRegistrationCessPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      doorstep_logistics_inr: (landed.dealerLogisticsToZonePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      tcs_inr: (landed.tcsPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
    },
    total_on_road_inr: (landed.totalLandedCostPaise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    }),
    total_on_road_paise: landed.totalLandedCostPaise,
    potential_group_savings_estimate_inr: '₹75,000 – ₹1,65,000 via GroupDrive reverse auction',
  };
}
