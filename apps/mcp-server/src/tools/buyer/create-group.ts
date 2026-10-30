import { z } from 'zod';
import { platformStore, PlatformGroup } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';
import { confirmationManager } from '../../security/confirmation.js';

export const createGroupSchema = z.object({
  brand: z
    .string()
    .min(1)
    .describe('Automobile manufacturer brand (e.g. Mahindra, Tata, Maruti Suzuki)'),
  model: z.string().min(1).describe('Automobile model (e.g. Scorpio-N, Nexon, Brezza)'),
  variant: z.string().min(1).describe('Lead vehicle variant name (e.g. Z4 Diesel 4WD MT)'),
  zone_id: z.string().min(1).describe('Delivery taluka/district zone ID (e.g. zone-baramati)'),
  target_size: z
    .number()
    .int()
    .min(3)
    .max(50)
    .describe('Target buyer quorum required to trigger the reverse auction (min 3)'),
  deadline_days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .describe('Duration in days before group expires if quorum not met'),
  color_preference: z.string().optional().describe('Initiator preferred exterior paint color'),
  confirmation_token: z
    .string()
    .optional()
    .describe('Cryptographic confirmation token from step 1 (required to execute write)'),
  idempotency_key: z
    .string()
    .optional()
    .describe('Unique client request key to prevent duplicate creation'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export async function handleCreateGroup(params: CreateGroupInput, auth: AuthContext) {
  const toolName = 'create_group';

  // Step 1: Proposal / Dry run
  if (!params.confirmation_token) {
    const summary =
      `Propose creating a new buyer group for ${params.brand} ${params.model} (${params.variant}) in zone '${params.zone_id}' ` +
      `with target quorum of ${params.target_size} buyers and a ${params.deadline_days}-day threshold window. ` +
      `Requires initial commitment deposit of ₹25,000 held pending delivery (100% refundable if quorum not met).`;

    const actionPayload = {
      brand: params.brand,
      model: params.model,
      variant: params.variant,
      zone_id: params.zone_id,
      target_size: params.target_size,
      deadline_days: params.deadline_days,
      color_preference: params.color_preference || 'Dealer Standard',
      deposit_required_paise: 2500000, // ₹25,000
      deposit_refund_policy: '100% full refund if minimum group threshold not met by deadline.',
    };

    return confirmationManager.createProposal(
      toolName,
      auth.userId,
      params as unknown as Record<string, unknown>,
      summary,
      actionPayload,
    );
  }

  // Step 2: Validate token and execute write
  confirmationManager.consumeToken(
    params.confirmation_token,
    toolName,
    auth.userId,
    params as unknown as Record<string, unknown>,
  );

  const newGroupId = `grp-${params.zone_id.replace('zone-', '')}-${params.model.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const deadline = new Date(now.getTime() + params.deadline_days * 24 * 3600 * 1000);

  const newGroup: PlatformGroup = {
    id: newGroupId,
    brand: params.brand,
    model: params.model,
    variant: params.variant,
    zoneId: params.zone_id,
    zoneName: `${params.zone_id.replace('zone-', '').toUpperCase()} Zone`,
    district: 'Registered District',
    state: 'Maharashtra',
    targetSize: params.target_size,
    currentSize: 1,
    status: 'OPEN',
    deadlineDate: deadline.toISOString(),
    createdAt: now.toISOString(),
    members: [
      {
        userId: auth.userId,
        variant: params.variant,
        color: params.color_preference || 'Standard',
        joinedAt: now.toISOString(),
      },
    ],
  };

  platformStore.groups.set(newGroup.id, newGroup);

  return {
    status: 'CONFIRMED',
    message: `Buyer group '${newGroup.id}' successfully created and open for local buyers.`,
    group: {
      group_id: newGroup.id,
      brand: newGroup.brand,
      model: newGroup.model,
      variant: newGroup.variant,
      zone_id: newGroup.zoneId,
      target_size: newGroup.targetSize,
      current_size: newGroup.currentSize,
      status: newGroup.status,
      deadline_date: newGroup.deadlineDate,
      initiator_user_id: auth.userId,
    },
  };
}
