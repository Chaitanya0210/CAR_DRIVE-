import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const getQuotesSchema = z.object({
  group_id: z
    .string()
    .min(1)
    .describe('Unique ID of the buyer group whose quotes should be retrieved'),
});

export type GetQuotesInput = z.infer<typeof getQuotesSchema>;

export async function handleGetQuotes(params: GetQuotesInput, _auth: AuthContext) {
  const group = platformStore.groups.get(params.group_id);
  if (!group) {
    throw new Error(`Group not found with ID '${params.group_id}'`);
  }

  // Find RFQs associated with this group
  const rfqs = Array.from(platformStore.rfqs.values()).filter((r) => r.groupId === group.id);
  if (rfqs.length === 0) {
    return {
      group_id: group.id,
      status: group.status,
      message: 'No reverse auction RFQ has been initiated for this group yet.',
      quotes_count: 0,
      quotes: [],
    };
  }

  const rfq = rfqs[0];
  const allQuotes = Array.from(platformStore.quotes.values()).filter((q) => q.rfqId === rfq.id);

  // Sealed Bidding Rules:
  // If the group is still in RFQ_OPEN, bids are sealed and hidden from buyers until the bidding window closes.
  if (group.status === 'RFQ_OPEN' || rfq.status === 'OPEN') {
    return {
      group_id: group.id,
      rfq_id: rfq.id,
      bidding_status: 'SEALED_BIDDING_ACTIVE',
      bidding_closes_in_hours: rfq.biddingClosesInHours,
      bidding_deadline: rfq.biddingDeadline,
      sealed_quotes_received_count: allQuotes.length,
      notice:
        'Sealed reverse auction is currently live. Individual dealer bids are encrypted and hidden from buyers and competitor dealers until bidding window closes to maximize price competition.',
      quotes: [],
    };
  }

  return {
    group_id: group.id,
    rfq_id: rfq.id,
    bidding_status: 'QUOTES_UNMASKED_FOR_VOTING',
    quotes_count: allQuotes.length,
    quotes: allQuotes.map((q) => ({
      quote_id: q.id,
      dealer_name: q.dealershipName,
      ex_showroom_discount_inr: (q.exShowroomDiscountPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      ex_showroom_discount_paise: q.exShowroomDiscountPaise,
      logistics_cost_inr: (q.logisticsCostPaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      logistics_cost_paise: q.logisticsCostPaise,
      free_accessories: q.freeAccessories,
      delivery_timeline_days: q.deliveryTimelineDays,
      validity_hours: q.validityHours,
      status: q.status,
    })),
  };
}
