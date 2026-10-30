import { describe, it, expect, beforeEach } from 'vitest';
import { GroupDriveMcpServer } from '../src/server.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { platformStore } from '../src/store/platform-store.js';

function parseCallJson(callResult: unknown): any {
  const res = callResult as { content?: Array<{ type: string; text: string }> };
  const rawText = res.content?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

describe('MCP Tool Contract & Schema Tests', () => {
  beforeEach(() => {
    platformStore.seedDefaultData();
  });

  describe('Buyer Tools Contract', () => {
    it('should expose all 9 buyer tools with valid JSON input schemas for buyer role', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client(
        { name: 'buyer-test-client', version: '1.0.0' },
        { capabilities: {} },
      );
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();

      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const listResponse = await client.listTools();
      const toolNames = listResponse.tools.map((t) => t.name);

      expect(toolNames).toHaveLength(9);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'search_groups',
          'get_group',
          'create_group',
          'join_group',
          'get_quotes',
          'compare_quotes',
          'calculate_on_road_price',
          'search_offered_vehicles',
          'track_booking',
        ]),
      );

      // Verify every tool has an object inputSchema
      for (const t of listResponse.tools) {
        expect(t.description).toBeDefined();
        expect(t.description!.length).toBeGreaterThan(10);
        expect(t.inputSchema.type).toBe('object');
        expect(t.inputSchema.properties).toBeDefined();
      }

      await client.close();
    });

    it('search_groups contract: returns filtered groups and fill rate', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'search_groups',
        arguments: { brand: 'Mahindra' },
      });

      const data = parseCallJson(result);
      expect(data.total_groups).toBeGreaterThanOrEqual(1);
      expect(data.groups[0].brand).toBe('Mahindra');
      expect(data.groups[0].model).toBe('Scorpio-N');
      expect(data.groups[0].fill_rate_percent).toBeDefined();

      await client.close();
    });

    it('calculate_on_road_price contract: outputs exact integer paise and formatted INR', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'calculate_on_road_price',
        arguments: {
          ex_showroom_paise: 125000000, // ₹12.5L
          state_code: 'MH',
          fuel_type: 'DIESEL',
        },
      });

      const data = parseCallJson(result);
      expect(data.total_on_road_paise).toBeGreaterThan(125000000);
      expect(data.line_items.road_tax_rto_inr).toBeDefined();
      expect(data.line_items.insurance_estimate_inr).toBeDefined();
      expect(data.line_items.fastag_cess_inr).toBeDefined();

      await client.close();
    });

    it('compare_quotes contract: calculates normalized landed cost breakdown and net savings', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'compare_quotes',
        arguments: {
          group_id: 'grp-satara-nexon-02',
          buyer_state: 'Maharashtra',
        },
      });

      const data = parseCallJson(result);
      expect(data.compared_quotes_count).toBe(2);
      expect(data.winning_quote_recommendation).toBeDefined();
      expect(data.winning_quote_recommendation.dealer_name).toBe('Pune Auto Hub Tata Motors');
      expect(data.quote_comparisons[0].net_buyer_savings_paise).toBeGreaterThan(0);

      await client.close();
    });

    it('track_booking contract: outputs held payment state and shipment milestones', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'track_booking',
        arguments: { booking_id: 'bkg-demo-101' },
      });

      const data = parseCallJson(result);
      expect(data.booking_id).toBe('bkg-demo-101');
      expect(data.payment_escrow_status.state).toBe('HELD_PENDING_DELIVERY');
      expect(data.shipment_milestones).toHaveLength(5);
      expect(data.documents_checklist).toBeDefined();

      await client.close();
    });
  });

  describe('Seller Tools Contract', () => {
    it('should expose all 5 seller tools with valid JSON input schemas for seller role', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-seller-token' });
      const client = new Client(
        { name: 'seller-test-client', version: '1.0.0' },
        { capabilities: {} },
      );
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();

      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const listResponse = await client.listTools();
      const toolNames = listResponse.tools.map((t) => t.name);

      expect(toolNames).toHaveLength(5);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'list_open_rfqs',
          'get_rfq_demand_insights',
          'draft_quote',
          'submit_quote',
          'list_my_listings',
        ]),
      );

      await client.close();
    });

    it('list_open_rfqs contract: returns RFQs filtered to dealer authorized brands and territory', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-seller-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'list_open_rfqs',
        arguments: {},
      });

      const data = parseCallJson(result);
      expect(data.total_open_rfqs).toBeGreaterThanOrEqual(1);
      expect(data.open_rfqs[0].rfq_id).toBeDefined();
      expect(data.open_rfqs[0].cohort_batch_size).toBeGreaterThanOrEqual(3);

      await client.close();
    });

    it('draft_quote contract: computes platform commission (1% + GST) and net dealer payout without submitting', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-seller-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      const result = await client.callTool({
        name: 'draft_quote',
        arguments: {
          rfq_id: 'rfq-satara-nexon-99',
          ex_showroom_discount_paise: 9000000,
          logistics_cost_paise: 500000,
          free_accessories: ['Floor Mats', 'Mud Flaps'],
          delivery_timeline_days: 14,
          validity_hours: 48,
        },
      });

      const data = parseCallJson(result);
      expect(data.status).toBe('DRAFT_CREATED');
      expect(data.draft_quote_id).toMatch(/^draft-qt-/);
      expect(data.batch_financial_projection.platform_commission_1_percent_inr).toBeDefined();
      expect(data.batch_financial_projection.gst_on_commission_18_percent_inr).toBeDefined();
      expect(data.batch_financial_projection.net_dealer_payout_inr).toBeDefined();

      await client.close();
    });
  });

  describe('Two-Step Write Confirmation Contract', () => {
    it('create_group: returns CONFIRMATION_REQUIRED in phase 1, and CONFIRMED in phase 2', async () => {
      const server = new GroupDriveMcpServer({ authToken: 'demo-buyer-token' });
      const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      const [cTrans, sTrans] = InMemoryTransport.createLinkedPair();
      await Promise.all([server.server.connect(sTrans), client.connect(cTrans)]);

      // Phase 1: Propose without confirmation_token
      const propResult = await client.callTool({
        name: 'create_group',
        arguments: {
          brand: 'Tata',
          model: 'Harrier',
          variant: 'Adventure Plus Dark',
          zone_id: 'zone-baramati',
          target_size: 4,
          deadline_days: 14,
        },
      });

      const propData = parseCallJson(propResult);
      expect(propData.status).toBe('CONFIRMATION_REQUIRED');
      expect(propData.confirmation_token).toMatch(/^gd_conf_/);
      expect(propData.expires_at_utc).toBeDefined();
      expect(propData.payload.deposit_required_paise).toBe(2500000);

      // Phase 2: Confirm with valid token
      const confirmResult = await client.callTool({
        name: 'create_group',
        arguments: {
          brand: 'Tata',
          model: 'Harrier',
          variant: 'Adventure Plus Dark',
          zone_id: 'zone-baramati',
          target_size: 4,
          deadline_days: 14,
          confirmation_token: propData.confirmation_token,
        },
      });

      const confirmData = parseCallJson(confirmResult);
      expect(confirmData.status).toBe('CONFIRMED');
      expect(confirmData.group.group_id).toBeDefined();
      expect(confirmData.group.current_size).toBe(1);

      await client.close();
    });
  });
});
