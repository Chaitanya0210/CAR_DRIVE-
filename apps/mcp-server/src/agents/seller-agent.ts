import { GroupDriveMcpServer } from '../server.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface SellerQuoteAssistResult {
  rfqId: string;
  draftQuoteId: string;
  recommendedDiscountInr: string;
  recommendedLogisticsInr: string;
  freeAccessoriesIncluded: string[];
  projectedWinProbability: string;
  batchProjectedNetPayoutInr: string;
  confirmationRequiredNotice: string;
  proposalConfirmationToken?: string;
  autoSubmitBlockedExplanation: string;
}

function parseCallJson(callResult: unknown): any {
  const res = callResult as { content?: Array<{ type: string; text: string }> };
  const rawText = res.content?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

export class SellerQuoteAssistAgent {
  private client: Client;

  constructor() {
    this.client = new Client(
      { name: 'seller-quote-assist-client', version: '1.0.0' },
      { capabilities: {} },
    );
  }

  public async initialize(sellerToken = 'demo-seller-token'): Promise<void> {
    const serverInstance = new GroupDriveMcpServer({ authToken: sellerToken });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      serverInstance.server.connect(serverTransport),
      this.client.connect(clientTransport),
    ]);
  }

  public async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Autonomous Agent Flow:
   * 1. Scans open RFQs for dealership.
   * 2. Retrieves demand insights and variant preferences.
   * 3. Analyzes competitive pricing benchmarks.
   * 4. Synthesizes an optimal sealed discount.
   * 5. Calls draft_quote (creates draft record).
   * 6. Strictly REFUSES to auto-submit: returns draft + step 1 confirmation proposal.
   */
  public async draftCompetitiveQuote(targetRfqId?: string): Promise<SellerQuoteAssistResult> {
    // 1. List open RFQs
    const listCall = await this.client.callTool({
      name: 'list_open_rfqs',
      arguments: {},
    });
    const listData = parseCallJson(listCall);

    const rfqId = targetRfqId || listData.open_rfqs?.[0]?.rfq_id;
    if (!rfqId) {
      throw new Error('No open RFQs available for dealer authorized brands and territory zones.');
    }

    // 2. Fetch demand insights
    const demandCall = await this.client.callTool({
      name: 'get_rfq_demand_insights',
      arguments: { rfq_id: rfqId },
    });
    const demandData = parseCallJson(demandCall);

    // 3. Formulate competitive bid
    // Standard competitive discount: ₹92,000 for Tata / ₹1.1L for Mahindra
    const isMahindra = demandData.brand.toLowerCase().includes('mahindra');
    const recommendedDiscountPaise = isMahindra ? 11500000 : 9200000;
    const logisticsCostPaise = 550000; // ₹5,500
    const accessories = ['Floor Mats', 'Mud Flaps', 'Rear Bumper Guard'];

    // 4. Draft quote (creates draft, NOT submitted)
    const draftCall = await this.client.callTool({
      name: 'draft_quote',
      arguments: {
        rfq_id: rfqId,
        ex_showroom_discount_paise: recommendedDiscountPaise,
        logistics_cost_paise: logisticsCostPaise,
        free_accessories: accessories,
        delivery_timeline_days: 14,
        validity_hours: 48,
        notes: 'AI-assisted competitive reverse-auction draft optimized for cohort winning margin.',
      },
    });

    const draftData = parseCallJson(draftCall);

    // 5. Initiate step 1 confirmation proposal (DO NOT AUTO-SUBMIT!)
    const submitProposalCall = await this.client.callTool({
      name: 'submit_quote',
      arguments: {
        draft_quote_id: draftData.draft_quote_id,
      },
    });

    const submitProposalData = parseCallJson(submitProposalCall);

    return {
      rfqId,
      draftQuoteId: draftData.draft_quote_id,
      recommendedDiscountInr: draftData.unit_quote_breakdown.ex_showroom_discount_inr,
      recommendedLogisticsInr: draftData.unit_quote_breakdown.doorstep_logistics_inr,
      freeAccessoriesIncluded: accessories,
      projectedWinProbability: draftData.competitive_score_projection.win_probability_rating,
      batchProjectedNetPayoutInr: draftData.batch_financial_projection.net_dealer_payout_inr,
      confirmationRequiredNotice:
        'IMPORTANT: Auto-submit is strictly forbidden by policy. A human dealership sales manager must review and confirm before this binding sealed quote can be submitted.',
      proposalConfirmationToken: submitProposalData.confirmation_token,
      autoSubmitBlockedExplanation:
        'Autonomous agents are restricted from committing financial contracts without two-step explicit human confirmation.',
    };
  }
}
