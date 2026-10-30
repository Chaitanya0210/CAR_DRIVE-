import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const searchOfferedVehiclesSchema = z.object({
  brand: z
    .string()
    .optional()
    .describe('Manufacturer brand filter (e.g. Tata, Mahindra, Maruti Suzuki)'),
  fuel: z.enum(['PETROL', 'DIESEL', 'CNG', 'EV']).optional().describe('Engine fuel type filter'),
  body_type: z.string().optional().describe('Body type filter (e.g. SUV, Hatchback, Sedan)'),
  zone_id: z.string().optional().describe('Location zone filter (e.g. zone-pune, zone-baramati)'),
  budget_max_paise: z
    .number()
    .int()
    .optional()
    .describe('Maximum budget in integer paise (e.g. 120000000 for ₹12L)'),
  category: z
    .enum(['STOCK_CLEARANCE', 'DEMO_TEST_DRIVE', 'PREVIOUS_YEAR', 'FESTIVAL_OFFER'])
    .optional()
    .describe('Clearance listing category'),
  sort_by: z.enum(['discount', 'price', 'deal_score']).default('deal_score').describe('Sort order'),
});

export type SearchOfferedVehiclesInput = z.infer<typeof searchOfferedVehiclesSchema>;

export async function handleSearchOfferedVehicles(
  params: SearchOfferedVehiclesInput,
  _auth: AuthContext,
) {
  let list = Array.from(platformStore.listings.values()).filter((l) => l.status === 'ACTIVE');

  if (params.brand) {
    list = list.filter((l) => l.brand.toLowerCase().includes(params.brand!.toLowerCase()));
  }
  if (params.fuel) {
    list = list.filter((l) => l.fuel === params.fuel);
  }
  if (params.zone_id) {
    list = list.filter((l) => l.locationZoneId === params.zone_id);
  }
  if (params.budget_max_paise) {
    list = list.filter((l) => l.offerPricePaise <= params.budget_max_paise!);
  }
  if (params.category) {
    list = list.filter((l) => l.category === params.category);
  }

  // Sorting
  if (params.sort_by === 'discount') {
    list.sort((a, b) => b.discountPercent - a.discountPercent);
  } else if (params.sort_by === 'price') {
    list.sort((a, b) => a.offerPricePaise - b.offerPricePaise);
  } else {
    list.sort((a, b) => b.dealScore - a.dealScore);
  }

  return {
    total_listings: list.length,
    listings: list.map((l) => ({
      listing_id: l.id,
      brand: l.brand,
      model: l.model,
      variant: l.variant,
      category: l.category,
      fuel: l.fuel,
      color: l.color,
      manufacturing_year: l.manufacturingYear,
      odometer_km: l.odometerKm ?? 0,
      original_price_inr: (l.originalPricePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      offer_price_inr: (l.offerPricePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      }),
      offer_price_paise: l.offerPricePaise,
      discount_percent: `${l.discountPercent}%`,
      dealer_name: l.dealershipName,
      location: `${l.locationCity}, ${l.state}`,
      units_available: l.unitsAvailable,
      deal_score: l.dealScore,
      can_form_group: l.canFormGroup,
      warranty_terms: l.warrantyTerms,
    })),
  };
}
