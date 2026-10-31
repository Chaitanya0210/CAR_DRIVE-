import { z } from 'zod';
import { assertValidTransition, CANONICAL_GROUP_TRANSITIONS } from '@groupdrive/shared';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';
import { confirmationManager } from '../../security/confirmation.js';

export const joinGroupSchema = z.object({
  group_id: z
    .string()
    .min(1)
    .describe('Unique ID of the buyer group to join (e.g., grp-baramati-scorpio-01)'),
  variant: z.string().min(1).describe('Selected vehicle variant name (e.g., Z4 Diesel 4WD MT)'),
  color_preference: z.string().min(1).describe('Preferred exterior color choice'),
  delivery_zone_id: z
    .string()
    .min(1)
    .describe('Buyer delivery zone ID (must match or be in cluster)'),
  confirmation_token: z
    .string()
    .optional()
    .describe('Cryptographic confirmation token from step 1 (required to execute write)'),
  idempotency_key: z
    .string()
    .optional()
    .describe('Unique client request key to prevent duplicate joins'),
});

export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

export async function handleJoinGroup(params: JoinGroupInput, auth: AuthContext) {
  const toolName = 'join_group';

  const group = platformStore.groups.get(params.group_id);
  if (!group) {
    throw new Error(`Group not found with ID '${params.group_id}'`);
  }

  if (group.status !== 'OPEN') {
    throw new Error(
      `Group '${params.group_id}' is in status '${group.status}' and is not accepting new members.`,
    );
  }

  // Check if user already joined
  const alreadyMember = group.members.some((m) => m.userId === auth.userId);
  if (alreadyMember) {
    throw new Error(
      `User '${auth.userId}' is already a registered member of group '${params.group_id}'.`,
    );
  }

  // Step 1: Proposal / Dry run
  if (!params.confirmation_token) {
    const projectedSize = group.currentSize + 1;
    const willHitThreshold = projectedSize >= group.targetSize;

    const summary =
      `Propose joining buyer group '${group.id}' (${group.brand} ${group.model}) with variant '${params.variant}' and color '${params.color_preference}'. ` +
      `Current group size will increase from ${group.currentSize} to ${projectedSize} of ${group.targetSize} required. ` +
      (willHitThreshold
        ? `This commitment WILL hit quorum and immediately trigger the 48-hour reverse auction for authorized dealers!`
        : `Requires commitment deposit of ₹25,000 held pending reverse auction and delivery.`) +
      ` 100% refundable if final dealer quote is rejected during voting.`;

    const actionPayload = {
      group_id: group.id,
      brand: group.brand,
      model: group.model,
      selected_variant: params.variant,
      color: params.color_preference,
      deposit_required_paise: 2500000, // ₹25,000
      projected_group_size: projectedSize,
      target_size: group.targetSize,
      will_trigger_rfq: willHitThreshold,
      refund_guarantee:
        '100% full refund of deposit if winning dealer quote is rejected during voting phase.',
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

  const now = new Date().toISOString();
  group.members.push({
    userId: auth.userId,
    variant: params.variant,
    color: params.color_preference,
    joinedAt: now,
  });
  group.currentSize = group.members.length;

  let transitionMessage = 'Joined group successfully.';
  if (group.currentSize >= group.targetSize) {
    assertValidTransition('Group', group.status, 'THRESHOLD_MET', CANONICAL_GROUP_TRANSITIONS);
    group.status = 'THRESHOLD_MET';
    transitionMessage = `Target quorum of ${group.targetSize} reached! Group transitioned to THRESHOLD_MET and RFQ reverse auction is being scheduled.`;
  }

  return {
    status: 'CONFIRMED',
    message: transitionMessage,
    group: {
      group_id: group.id,
      current_size: group.currentSize,
      target_size: group.targetSize,
      fill_rate_percent: Math.round((group.currentSize / group.targetSize) * 100),
      status: group.status,
      member_joined: {
        user_id: auth.userId,
        variant: params.variant,
        color: params.color_preference,
        joined_at: now,
      },
    },
  };
}
