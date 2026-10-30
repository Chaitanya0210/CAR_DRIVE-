import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const listOpenRfqsSchema = z.object({
  brand: z
    .string()
    .optional()
    .describe('Filter by vehicle brand (must match dealer authorization)'),
  zone_id: z
    .string()
    .optional()
    .describe('Filter by geographic delivery zone (must be within dealer serviceable zones)'),
});

export type ListOpenRfqsInput = z.infer<typeof listOpenRfqsSchema>;

export async function handleListOpenRfqs(params: ListOpenRfqsInput, auth: AuthContext) {
  let rfqs = Array.from(platformStore.rfqs.values()).filter((r) => r.status === 'OPEN');

  // Filter by seller's authorized brands
  if (auth.authorizedBrands && auth.authorizedBrands.length > 0) {
    rfqs = rfqs.filter((r) =>
      auth.authorizedBrands!.some((b) => b.toLowerCase() === r.brand.toLowerCase()),
    );
  }

  // Filter by seller's serviceable zones
  if (auth.serviceableZones && auth.serviceableZones.length > 0) {
    rfqs = rfqs.filter((r) => auth.serviceableZones!.includes(r.zoneId));
  }

  if (params.brand) {
    rfqs = rfqs.filter((r) => r.brand.toLowerCase().includes(params.brand!.toLowerCase()));
  }
  if (params.zone_id) {
    rfqs = rfqs.filter((r) => r.zoneId === params.zone_id);
  }

  return {
    dealer_id: auth.dealershipId || 'authorized-dealer',
    authorized_brands: auth.authorizedBrands || ['ALL'],
    serviceable_zones: auth.serviceableZones || ['ALL'],
    total_open_rfqs: rfqs.length,
    open_rfqs: rfqs.map((r) => {
      const g = platformStore.groups.get(r.groupId);
      return {
        rfq_id: r.id,
        group_id: r.groupId,
        brand: r.brand,
        model: r.model,
        cohort_batch_size: r.quantity,
        zone_id: r.zoneId,
        district: r.district,
        state: r.state,
        bidding_closes_in_hours: r.biddingClosesInHours,
        bidding_deadline: r.biddingDeadline,
        group_lead_variant: g ? g.variant : 'Standard',
        deal_opportunity: `Batch deal of ${r.quantity} vehicles delivered together to ${r.district}. Single bulk invoice & carrier logistics.`,
      };
    }),
  };
}
