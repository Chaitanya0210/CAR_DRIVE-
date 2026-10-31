import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext, ForbiddenError } from '../../auth/tokens.js';

export const listMyListingsSchema = z.object({
  status: z
    .enum(['ACTIVE', 'SOLD', 'PENDING_MODERATION'])
    .optional()
    .describe('Filter by listing publication status'),
});

export type ListMyListingsInput = z.infer<typeof listMyListingsSchema>;

export async function handleListMyListings(params: ListMyListingsInput, auth: AuthContext) {
  let listings = Array.from(platformStore.listings.values());

  // Enforce tenant boundary: sellers can only inspect their own listings
  if (auth.role === 'SELLER') {
    if (!auth.dealershipId) {
      throw new ForbiddenError(
        'Access denied: Seller session missing authorized dealership association.',
      );
    }
    listings = listings.filter((l) => l.dealerId === auth.dealershipId);
  }

  if (params.status) {
    listings = listings.filter((l) => l.status === params.status);
  }

  return {
    dealership_id: auth.dealershipId || 'all-dealers',
    total_listings: listings.length,
    listings: listings.map((l) => ({
      listing_id: l.id,
      brand: l.brand,
      model: l.model,
      variant: l.variant,
      category: l.category,
      color: l.color,
      manufacturing_year: l.manufacturingYear,
      units_available: l.unitsAvailable,
      original_price_inr: (l.originalPricePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      offer_price_inr: (l.offerPricePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      discount_percent: `${l.discountPercent}%`,
      status: l.status,
      deal_score: l.dealScore,
      can_form_group: l.canFormGroup,
      location: `${l.locationCity}, ${l.state}`,
    })),
  };
}
