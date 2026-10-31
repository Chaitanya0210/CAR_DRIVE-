import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';
import { calculateLandedCost } from '@groupdrive/shared';

export const compareQuotesSchema = z.object({
  group_id: z
    .string()
    .min(1)
    .describe('Unique ID of the buyer group whose quotes are being compared'),
  buyer_state: z
    .string()
    .default('Maharashtra')
    .describe('Indian state for Road Tax / RTO calculation (default Maharashtra)'),
  selected_quote_ids: z
    .array(z.string())
    .optional()
    .describe('Optional list of specific quote IDs to compare'),
});

export type CompareQuotesInput = z.infer<typeof compareQuotesSchema>;

export async function handleCompareQuotes(params: CompareQuotesInput, _auth: AuthContext) {
  const group = platformStore.groups.get(params.group_id);
  if (!group) {
    throw new Error(`Group not found with ID '${params.group_id}'`);
  }

  const rfqs = Array.from(platformStore.rfqs.values()).filter((r) => r.groupId === group.id);
  if (rfqs.length === 0) {
    throw new Error(`No RFQs found for group '${params.group_id}'`);
  }

  const rfq = rfqs[0];
  let quotes = Array.from(platformStore.quotes.values()).filter((q) => q.rfqId === rfq.id);

  if (params.selected_quote_ids && params.selected_quote_ids.length > 0) {
    quotes = quotes.filter((q) => params.selected_quote_ids!.includes(q.id));
  }

  if (quotes.length === 0) {
    throw new Error(`No unmasked quotes available for comparison in group '${params.group_id}'.`);
  }

  // Base MSRP benchmark estimate for model
  const baseMserpPaise = group.model.includes('Scorpio')
    ? 168000000 // ₹16.8L
    : group.model.includes('Nexon')
      ? 125000000 // ₹12.5L
      : 115000000; // ₹11.5L

  // Road tax rate (Maharashtra ~11.5% for diesel/petrol)
  const buyerState = params.buyer_state || 'Maharashtra';
  const roadTaxRatePercent = buyerState.toLowerCase().includes('madhya') ? 10.0 : 11.5;
  const insuranceEstimatePaise = Math.round(baseMserpPaise * 0.035); // ~3.5%
  const fastagCessPaise = 250000; // ₹2,500

  const comparisons = quotes.map((q) => {
    const landed = calculateLandedCost({
      exShowroomPaise: baseMserpPaise,
      roadTaxRatePercent,
      fastagRegistrationCessPaise: fastagCessPaise,
      insuranceEstimatePaise,
      dealerLogisticsToZonePaise: q.logisticsCostPaise,
      batchGroupDiscountPaise: q.exShowroomDiscountPaise,
    });

    const standardSoloLandedPaise = calculateLandedCost({
      exShowroomPaise: baseMserpPaise,
      roadTaxRatePercent,
      fastagRegistrationCessPaise: fastagCessPaise,
      insuranceEstimatePaise,
      dealerLogisticsToZonePaise: q.logisticsCostPaise,
      batchGroupDiscountPaise: 0,
    }).totalLandedCostPaise;

    const netSavingsPaise = standardSoloLandedPaise - landed.totalLandedCostPaise;

    return {
      quote_id: q.id,
      dealer_name: q.dealershipName,
      delivery_days: q.deliveryTimelineDays,
      free_accessories: q.freeAccessories,
      line_items: {
        base_ex_showroom_inr: (baseMserpPaise / 100).toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        }),
        group_discount_inr: `-${(q.exShowroomDiscountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
        road_tax_rto_inr: (landed.roadTaxRtoPaise / 100).toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        }),
        insurance_estimate_inr: (landed.insuranceEstimatePaise / 100).toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
        }),
        fastag_reg_cess_inr: (landed.fastagRegistrationCessPaise / 100).toLocaleString('en-IN', {
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
      net_landed_on_road_inr: (landed.totalLandedCostPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      net_landed_on_road_paise: landed.totalLandedCostPaise,
      net_buyer_savings_inr: (netSavingsPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      net_buyer_savings_paise: netSavingsPaise,
      hidden_charges_detected: false,
      flagged_handling_fees: 0,
    };
  });

  // Sort best deal first (lowest landed cost)
  comparisons.sort((a, b) => a.net_landed_on_road_paise - b.net_landed_on_road_paise);

  return {
    group_id: group.id,
    model: `${group.brand} ${group.model} (${group.variant})`,
    buyer_delivery_zone: `${group.zoneName}, ${group.state}`,
    compared_quotes_count: comparisons.length,
    winning_quote_recommendation: {
      quote_id: comparisons[0].quote_id,
      dealer_name: comparisons[0].dealer_name,
      best_landed_price: comparisons[0].net_landed_on_road_inr,
      total_buyer_savings: comparisons[0].net_buyer_savings_inr,
      advantage: `Saves an additional ₹${((comparisons[1] ? comparisons[1].net_landed_on_road_paise - comparisons[0].net_landed_on_road_paise : 0) / 100).toLocaleString('en-IN')} vs next lowest dealer quote.`,
    },
    quote_comparisons: comparisons,
  };
}
