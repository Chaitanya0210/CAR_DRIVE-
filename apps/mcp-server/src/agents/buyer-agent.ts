import { GroupDriveMcpServer } from '../server.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface BuyerPreferenceQuery {
  budgetMaxPaise?: number;
  brand?: string;
  model?: string;
  fuel?: 'PETROL' | 'DIESEL' | 'CNG' | 'EV';
  zoneId: string;
}

export interface BuyerAgentRecommendation {
  summary: string;
  bestOptionType: 'ACTIVE_GROUP_REVERSE_AUCTION' | 'STOCK_CLEARANCE_LISTING';
  recommendedItem: Record<string, unknown>;
  landedCostBreakdown?: Record<string, unknown>;
  projectedSavings: string;
  nextStepAction: string;
}

function parseCallJson(callResult: unknown): any {
  const res = callResult as { content?: Array<{ type: string; text: string }> };
  const rawText = res.content?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

export class BuyerAgent {
  private client: Client;
  private serverTransport: any;
  private clientTransport: any;

  constructor() {
    this.client = new Client(
      { name: 'buyer-agent-client', version: '1.0.0' },
      { capabilities: {} },
    );
  }

  public async initialize(buyerToken = 'demo-buyer-token'): Promise<void> {
    const serverInstance = new GroupDriveMcpServer({ authToken: buyerToken });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    this.clientTransport = clientTransport;
    this.serverTransport = serverTransport;

    await Promise.all([
      serverInstance.server.connect(serverTransport),
      this.client.connect(clientTransport),
    ]);
  }

  public async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Autonomous agent flow:
   * 1. Searches active buyer groups matching zone/model.
   * 2. If group with quotes found, compares quotes using landed-cost engine.
   * 3. Also searches stock clearance vehicle listings.
   * 4. Synthesizes optimal deal with transparent financial explanation.
   */
  public async findBestDeal(query: BuyerPreferenceQuery): Promise<BuyerAgentRecommendation> {
    // Step 1: Search active groups
    const groupsCall = await this.client.callTool({
      name: 'search_groups',
      arguments: {
        zone_id: query.zoneId,
        brand: query.brand,
        model: query.model,
      },
    });

    const groupsData = parseCallJson(groupsCall);

    // Step 2: Search clearance stock listings
    const vehiclesCall = await this.client.callTool({
      name: 'search_offered_vehicles',
      arguments: {
        zone_id: query.zoneId,
        brand: query.brand,
        fuel: query.fuel,
        budget_max_paise: query.budgetMaxPaise,
      },
    });

    const vehiclesData = parseCallJson(vehiclesCall);

    // If an active group is in QUOTES_CLOSED or VOTING, evaluate quote comparisons
    const activeCohortWithQuotes = groupsData.groups?.find(
      (g: any) => g.status === 'QUOTES_CLOSED' || g.status === 'VOTING',
    );

    if (activeCohortWithQuotes) {
      const compareCall = await this.client.callTool({
        name: 'compare_quotes',
        arguments: {
          group_id: activeCohortWithQuotes.group_id,
          buyer_state: 'Maharashtra',
        },
      });

      const compareData = parseCallJson(compareCall);
      const winning = compareData.winning_quote_recommendation;

      return {
        summary:
          `Found active cohort '${activeCohortWithQuotes.group_id}' for ${activeCohortWithQuotes.brand} ${activeCohortWithQuotes.model}. ` +
          `Reverse auction has completed with ${compareData.compared_quotes_count} sealed dealer quotes unmasked. ` +
          `Top recommendation: ${winning.dealer_name} at net landed cost of ${winning.best_landed_price}.`,
        bestOptionType: 'ACTIVE_GROUP_REVERSE_AUCTION',
        recommendedItem: compareData,
        landedCostBreakdown: compareData.quote_comparisons[0]?.line_items,
        projectedSavings: winning.total_buyer_savings,
        nextStepAction: `Cast vote for '${winning.dealer_name}' or proceed to two-step booking confirmation.`,
      };
    }

    // If an open group exists (seeking quorum)
    const openGroup = groupsData.groups?.find((g: any) => g.status === 'OPEN');
    if (openGroup) {
      // Calculate projected on-road price
      const priceCall = await this.client.callTool({
        name: 'calculate_on_road_price',
        arguments: {
          ex_showroom_paise: query.budgetMaxPaise || 125000000,
          state_code: 'MH',
          fuel_type: query.fuel || 'DIESEL',
        },
      });
      const priceData = parseCallJson(priceCall);

      return {
        summary:
          `Found active forming group '${openGroup.group_id}' for ${openGroup.brand} ${openGroup.model} in ${openGroup.zone_name}. ` +
          `Currently at ${openGroup.current_size}/${openGroup.target_size} buyers (${openGroup.fill_rate_percent}% full). ` +
          `Joining will bring group closer to triggering the sealed reverse auction with expected bulk discount of ₹85,000–₹1,65,000.`,
        bestOptionType: 'ACTIVE_GROUP_REVERSE_AUCTION',
        recommendedItem: openGroup,
        landedCostBreakdown: priceData.line_items,
        projectedSavings: '₹85,000 – ₹1,65,000 estimated cohort reverse auction savings',
        nextStepAction: `Initiate two-step 'join_group' commitment (₹25,000 held deposit).`,
      };
    }

    // Otherwise, check clearance listings
    if (vehiclesData.listings && vehiclesData.listings.length > 0) {
      const topListing = vehiclesData.listings[0];
      return {
        summary:
          `Found high-value immediate clearance vehicle: ${topListing.brand} ${topListing.model} (${topListing.variant}) ` +
          `offered by ${topListing.dealer_name} in ${topListing.location}. Offer price: ${topListing.offer_price_inr} (${topListing.discount_percent} discount).`,
        bestOptionType: 'STOCK_CLEARANCE_LISTING',
        recommendedItem: topListing,
        projectedSavings: `${topListing.discount_percent} dealer discount (${topListing.deal_score}/100 deal score)`,
        nextStepAction: `Proceed to book directly or form a mini-cohort if multiple units available.`,
      };
    }

    return {
      summary: `No matching groups or clearance listings found for zone '${query.zoneId}'.`,
      bestOptionType: 'ACTIVE_GROUP_REVERSE_AUCTION',
      recommendedItem: {},
      projectedSavings: 'N/A',
      nextStepAction: `Initiate two-step 'create_group' to aggregate local buyers in your taluka.`,
    };
  }
}
