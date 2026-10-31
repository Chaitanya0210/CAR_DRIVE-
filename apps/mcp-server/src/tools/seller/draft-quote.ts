import { z } from 'zod';
import { calculatePlatformCommission } from '@groupdrive/shared';
import { platformStore, PlatformQuote } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const draftQuoteSchema = z.object({
  rfq_id: z.string().min(1).describe('Target open RFQ ID to bid on'),
  ex_showroom_discount_paise: z
    .number()
    .int()
    .min(1000000)
    .describe('Ex-showroom discount offered per vehicle in paise (e.g. 9000000 for ₹90,000)'),
  logistics_cost_paise: z
    .number()
    .int()
    .min(0)
    .default(500000)
    .describe('Batch carrier delivery fee per vehicle in paise (e.g. 500000 for ₹5,000)'),
  free_accessories: z
    .array(z.string())
    .default([])
    .describe('List of complementary dealer accessories offered'),
  delivery_timeline_days: z
    .number()
    .int()
    .min(1)
    .max(60)
    .default(14)
    .describe('Committed delivery days to local hub'),
  validity_hours: z
    .number()
    .int()
    .min(24)
    .max(168)
    .default(48)
    .describe('Quote price lock validity period in hours'),
  notes: z.string().optional().describe('Internal dealer pricing notes or delivery provisions'),
});

export type DraftQuoteInput = z.infer<typeof draftQuoteSchema>;

export async function handleDraftQuote(params: DraftQuoteInput, auth: AuthContext) {
  const rfq = platformStore.rfqs.get(params.rfq_id);
  if (!rfq) {
    throw new Error(`RFQ not found with ID '${params.rfq_id}'`);
  }

  const group = platformStore.groups.get(rfq.groupId);
  const cohortQuantity = group ? group.currentSize : rfq.quantity;

  const draftQuoteId = `draft-qt-${Date.now().toString().slice(-6)}`;

  // Base MSRP estimation for gross volume calculation
  const unitMsrpPaise = 150000000; // ₹15.0L
  const grossDealValuePerUnitPaise =
    unitMsrpPaise - params.ex_showroom_discount_paise + params.logistics_cost_paise;
  const totalBatchDealValuePaise = grossDealValuePerUnitPaise * cohortQuantity;

  // Platform commission: exactly 1% of final deal value + 18% GST on commission via basis points
  const commSplit = calculatePlatformCommission(totalBatchDealValuePaise);
  const platformCommissionBasePaise = commSplit.commissionPaise;
  const platformCommissionGstPaise = commSplit.gstPaise;
  const totalPlatformFeePaise = commSplit.totalPlatformFeePaise;
  const netDealerPayoutBatchPaise = commSplit.netDealerPayoutPaise;

  const draftRecord: PlatformQuote = {
    id: draftQuoteId,
    rfqId: rfq.id,
    dealerId: auth.dealershipId || 'dealer-demo-01',
    dealershipName: auth.dealershipId
      ? `Dealership ${auth.dealershipId}`
      : 'Authorized Dealership Network',
    exShowroomDiscountPaise: params.ex_showroom_discount_paise,
    logisticsCostPaise: params.logistics_cost_paise,
    freeAccessories: params.free_accessories,
    deliveryTimelineDays: params.delivery_timeline_days,
    validityHours: params.validity_hours,
    submittedAt: new Date().toISOString(),
    status: 'SEALED',
  };

  // Store in memory quotes as a draft
  platformStore.quotes.set(draftRecord.id, draftRecord);

  return {
    status: 'DRAFT_CREATED',
    draft_quote_id: draftQuoteId,
    rfq_id: rfq.id,
    cohort_vehicles_count: cohortQuantity,
    unit_quote_breakdown: {
      ex_showroom_discount_inr: (params.ex_showroom_discount_paise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      doorstep_logistics_inr: (params.logistics_cost_paise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      free_accessories_count: params.free_accessories.length,
      free_accessories: params.free_accessories,
      committed_delivery_days: `${params.delivery_timeline_days} days`,
      price_lock_validity: `${params.validity_hours} hours`,
    },
    batch_financial_projection: {
      total_gross_batch_deal_value_inr: (totalBatchDealValuePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      platform_commission_1_percent_inr: (platformCommissionBasePaise / 100).toLocaleString(
        'en-IN',
        { style: 'currency', currency: 'INR' },
      ),
      gst_on_commission_18_percent_inr: (platformCommissionGstPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      net_dealer_payout_inr: (netDealerPayoutBatchPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
    },
    competitive_score_projection: {
      win_probability_rating: params.ex_showroom_discount_paise >= 8500000 ? 'HIGH' : 'MODERATE',
      recommendation:
        params.free_accessories.length > 0
          ? 'Free accessory inclusions significantly improve buyer vote preference.'
          : 'Consider adding basic accessories to enhance perceived value without discounting cash further.',
    },
    important_notice:
      'This quote is currently in DRAFT status and has NOT been submitted to the auction. To officially submit this bid, proceed to submit_quote (requires two-step confirmation).',
  };
}
