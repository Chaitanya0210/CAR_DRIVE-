import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const searchGroupsSchema = z.object({
  brand: z
    .string()
    .optional()
    .describe('Filter by vehicle manufacturer brand (e.g., Mahindra, Tata, Maruti Suzuki)'),
  model: z
    .string()
    .optional()
    .describe('Filter by vehicle model name (e.g., Scorpio-N, Nexon, Brezza)'),
  zone_id: z
    .string()
    .optional()
    .describe('Filter by geographic delivery zone (e.g., zone-baramati, zone-satara)'),
  status: z
    .enum([
      'OPEN',
      'THRESHOLD_MET',
      'RFQ_OPEN',
      'QUOTES_CLOSED',
      'VOTING',
      'WINNER_SELECTED',
      'BOOKING',
      'COMPLETED',
    ])
    .optional()
    .describe('Filter by group buying state machine status'),
  min_members: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Filter for groups with at least this number of committed buyers'),
});

export type SearchGroupsInput = z.infer<typeof searchGroupsSchema>;

export async function handleSearchGroups(params: SearchGroupsInput, _auth: AuthContext) {
  let list = Array.from(platformStore.groups.values());

  if (params.brand) {
    list = list.filter((g) => g.brand.toLowerCase().includes(params.brand!.toLowerCase()));
  }
  if (params.model) {
    list = list.filter((g) => g.model.toLowerCase().includes(params.model!.toLowerCase()));
  }
  if (params.zone_id) {
    list = list.filter((g) => g.zoneId === params.zone_id);
  }
  if (params.status) {
    list = list.filter((g) => g.status === params.status);
  }
  if (params.min_members) {
    list = list.filter((g) => g.currentSize >= params.min_members!);
  }

  return {
    total_groups: list.length,
    groups: list.map((g) => ({
      group_id: g.id,
      brand: g.brand,
      model: g.model,
      variant: g.variant,
      zone_id: g.zoneId,
      zone_name: g.zoneName,
      district: g.district,
      state: g.state,
      target_size: g.targetSize,
      current_size: g.currentSize,
      fill_rate_percent: Math.round((g.currentSize / g.targetSize) * 100),
      status: g.status,
      deadline_date: g.deadlineDate,
      estimated_bulk_discount: '₹75,000 – ₹1,80,000 per buyer via sealed reverse auction',
    })),
  };
}
