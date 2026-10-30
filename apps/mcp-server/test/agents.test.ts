import { describe, it, expect, beforeEach } from 'vitest';
import { platformStore } from '../src/store/platform-store.js';
import { BuyerAgent } from '../src/agents/buyer-agent.js';
import { SellerQuoteAssistAgent } from '../src/agents/seller-agent.js';
import { AdminAgent } from '../src/agents/admin-agent.js';

describe('Autonomous Specialized Agents Suite', () => {
  beforeEach(() => {
    platformStore.seedDefaultData();
  });

  describe('Buyer Agent', () => {
    it('discovers best active group, compares quotes, and explains savings with line-item breakdown', async () => {
      const agent = new BuyerAgent();
      await agent.initialize('demo-buyer-token');

      const recommendation = await agent.findBestDeal({
        brand: 'Tata',
        model: 'Nexon',
        zoneId: 'zone-satara',
        fuel: 'DIESEL',
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.bestOptionType).toBe('ACTIVE_GROUP_REVERSE_AUCTION');
      expect(recommendation.summary).toContain('Nexon');
      expect(recommendation.summary).toContain('Pune Auto Hub Tata Motors');
      expect(recommendation.landedCostBreakdown).toBeDefined();
      expect(recommendation.projectedSavings).toBeDefined();
      expect(recommendation.nextStepAction).toContain('vote');

      await agent.close();
    });

    it('falls back to high-value clearance stock listing when no quorum cohort exists', async () => {
      const agent = new BuyerAgent();
      await agent.initialize('demo-buyer-token');

      const recommendation = await agent.findBestDeal({
        brand: 'Tata',
        zoneId: 'zone-pune',
        fuel: 'DIESEL',
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.bestOptionType).toBe('STOCK_CLEARANCE_LISTING');
      expect(recommendation.summary).toContain('Pune Auto Hub');
      expect(recommendation.projectedSavings).toContain('16.9%');

      await agent.close();
    });
  });

  describe('Seller Quote-Assist Agent', () => {
    it('drafts a competitive quote from demand data and strictly NEVER auto-submits without human confirmation', async () => {
      const agent = new SellerQuoteAssistAgent();
      await agent.initialize('demo-seller-token');

      const result = await agent.draftCompetitiveQuote('rfq-satara-nexon-99');

      expect(result.rfqId).toBe('rfq-satara-nexon-99');
      expect(result.draftQuoteId).toMatch(/^draft-qt-/);
      expect(result.recommendedDiscountInr).toBeDefined();
      expect(result.freeAccessoriesIncluded).toHaveLength(3);
      expect(result.projectedWinProbability).toBe('HIGH');
      expect(result.batchProjectedNetPayoutInr).toBeDefined();

      // Guardrail verification: Auto-submit MUST be blocked
      expect(result.autoSubmitBlockedExplanation).toContain(
        'Autonomous agents are restricted from committing financial contracts',
      );
      expect(result.proposalConfirmationToken).toBeDefined();
      expect(result.proposalConfirmationToken).toMatch(/^gd_conf_/);

      await agent.close();
    });
  });

  describe('Admin Agent', () => {
    it('summarizes active disputes and flags pricing and delivery anomalies', async () => {
      const agent = new AdminAgent();

      // Seed an anomalous booking with high odometer (>100 km)
      platformStore.bookings.set('bkg-anomaly-99', {
        id: 'bkg-anomaly-99',
        userId: 'buyer-99',
        groupId: 'grp-baramati-scorpio-01',
        quoteId: 'qt-scorpio-winner-01',
        variant: 'Z4 Diesel 4WD MT',
        bookingAmountPaise: 2500000,
        paymentState: 'DISPUTED',
        shipmentMilestones: [],
        odometerKmAtPdi: 185, // VIOLATION! >100 km
        documentChecklist: [],
        disputeId: 'disp-solapur-901',
      });

      // Seed an unrealistic clearance listing (>30% discount on new car)
      platformStore.listings.set('list-fraud-pricing', {
        id: 'list-fraud-pricing',
        dealerId: 'dealer-shady',
        dealershipName: 'Shady Motors',
        brand: 'Mahindra',
        model: 'Thar',
        variant: 'LX Hard Top Diesel AT',
        category: 'STOCK_CLEARANCE',
        manufacturingYear: 2026,
        color: 'Red Rage',
        fuel: 'DIESEL',
        transmission: 'AUTOMATIC',
        originalPricePaise: 180000000,
        offerPricePaise: 110000000,
        discountPercent: 38.9, // Unrealistic pricing!
        unitsAvailable: 2,
        locationZoneId: 'zone-baramati',
        locationCity: 'Baramati',
        state: 'Maharashtra',
        warrantyTerms: 'Standard',
        status: 'ACTIVE',
        dealScore: 99,
        canFormGroup: true,
      });

      const report = await agent.analyzePlatformAnomalies();

      expect(report.totalActiveDisputes).toBeGreaterThanOrEqual(1);
      expect(report.totalAnomaliesDetected).toBeGreaterThanOrEqual(2);

      // Verify specific anomaly detection
      const odoAnomaly = report.anomalies.find((a) => a.category === 'ODOMETER_FRAUD');
      expect(odoAnomaly).toBeDefined();
      expect(odoAnomaly?.severity).toBe('CRITICAL');
      expect(odoAnomaly?.details).toContain('185 km');
      expect(odoAnomaly?.recommendedMitigation).toContain('Freeze escrow');

      const priceAnomaly = report.anomalies.find((a) => a.category === 'UNREALISTIC_PRICING');
      expect(priceAnomaly).toBeDefined();
      expect(priceAnomaly?.severity).toBe('HIGH');
      expect(priceAnomaly?.details).toContain('38.9% discount');

      expect(report.executiveSummary).toContain('Escrow safeguards are active');
    });
  });
});
