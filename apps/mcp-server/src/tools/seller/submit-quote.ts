import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';
import { confirmationManager } from '../../security/confirmation.js';

export const submitQuoteSchema = z.object({
  draft_quote_id: z
    .string()
    .min(1)
    .describe('The draft quote ID to officially seal and submit into the auction'),
  confirmation_token: z
    .string()
    .optional()
    .describe('Cryptographic confirmation token from step 1 (required to execute write)'),
  idempotency_key: z
    .string()
    .optional()
    .describe('Unique client request key to prevent duplicate bid submissions'),
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;

export async function handleSubmitQuote(params: SubmitQuoteInput, auth: AuthContext) {
  const toolName = 'submit_quote';

  const quote = platformStore.quotes.get(params.draft_quote_id);
  if (!quote) {
    throw new Error(`Draft quote not found with ID '${params.draft_quote_id}'`);
  }

  const rfq = platformStore.rfqs.get(quote.rfqId);
  if (!rfq) {
    throw new Error(`Associated RFQ '${quote.rfqId}' not found.`);
  }

  if (rfq.status !== 'OPEN') {
    throw new Error(
      `Cannot submit quote: RFQ '${rfq.id}' is in status '${rfq.status}' and bidding is closed.`,
    );
  }

  // Step 1: Proposal / Dry run
  if (!params.confirmation_token) {
    const summary =
      `Propose officially submitting sealed binding reverse auction quote '${quote.id}' for RFQ '${rfq.id}' ` +
      `(${rfq.brand} ${rfq.model}, quantity: ${rfq.quantity} vehicles in ${rfq.district}). ` +
      `Unit discount: ₹${(quote.exShowroomDiscountPaise / 100).toLocaleString('en-IN')}, ` +
      `Logistics: ₹${(quote.logisticsCostPaise / 100).toLocaleString('en-IN')}, ` +
      `Committed delivery: ${quote.deliveryTimelineDays} days. ` +
      `By confirming, dealership legally enters a sealed binding bid with 48h price validity and platform settlement rules.`;

    const actionPayload = {
      draft_quote_id: quote.id,
      rfq_id: rfq.id,
      cohort_quantity: rfq.quantity,
      unit_discount_paise: quote.exShowroomDiscountPaise,
      unit_logistics_paise: quote.logisticsCostPaise,
      delivery_days: quote.deliveryTimelineDays,
      validity_hours: quote.validityHours,
      binding_commitment:
        'Dealership agrees to supply all units at quoted terms if selected as cohort winner.',
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

  quote.status = 'SEALED';
  quote.submittedAt = new Date().toISOString();

  return {
    status: 'CONFIRMED',
    message: `Quote '${quote.id}' officially sealed and submitted into reverse auction for RFQ '${rfq.id}'.`,
    submission_details: {
      quote_id: quote.id,
      rfq_id: rfq.id,
      dealership_id: auth.dealershipId || quote.dealerId,
      status: 'SEALED_ACTIVE',
      sealed_until: rfq.biddingDeadline,
      submitted_at_utc: quote.submittedAt,
    },
  };
}
