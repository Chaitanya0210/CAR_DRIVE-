import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const getGroupSchema = z.object({
  group_id: z
    .string()
    .min(1)
    .describe('Unique ID of the buyer group (e.g., grp-baramati-scorpio-01)'),
});

export type GetGroupInput = z.infer<typeof getGroupSchema>;

export async function handleGetGroup(params: GetGroupInput, _auth: AuthContext) {
  const g = platformStore.groups.get(params.group_id);
  if (!g) {
    throw new Error(`Group not found with ID '${params.group_id}'`);
  }

  // Count variant preferences
  const variantCounts: Record<string, number> = {};
  for (const m of g.members) {
    variantCounts[m.variant] = (variantCounts[m.variant] || 0) + 1;
  }

  return {
    group_id: g.id,
    brand: g.brand,
    model: g.model,
    variant_lead: g.variant,
    zone_id: g.zoneId,
    zone_name: g.zoneName,
    district: g.district,
    state: g.state,
    target_size: g.targetSize,
    current_size: g.currentSize,
    fill_rate_percent: Math.round((g.currentSize / g.targetSize) * 100),
    status: g.status,
    deadline_date: g.deadlineDate,
    created_at: g.createdAt,
    variant_breakdown: variantCounts,
    members: g.members.map((m, idx) => ({
      member_index: idx + 1,
      variant: m.variant,
      color: m.color,
      joined_at: m.joinedAt,
    })),
  };
}
