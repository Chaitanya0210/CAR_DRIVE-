import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationsService } from '../notifications.service';
import { renderTemplate } from '../templates';

describe('Notifications Service & Cross-Channel Delivery', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
  });

  describe('Multilingual Template Rendering', () => {
    it('renders English templates with variable interpolation', () => {
      const rendered = renderTemplate('GROUP_CREATED', 'en', {
        brand: 'Mahindra',
        model: 'Scorpio-N',
        zone: 'Baramati',
        targetSize: 5,
      });

      expect(rendered.body).toContain('Mahindra Scorpio-N');
      expect(rendered.body).toContain('Baramati');
      expect(rendered.body).toContain('5 buyers');
    });

    it('renders Hindi templates with correct Devanagari text and numbers', () => {
      const rendered = renderTemplate('THRESHOLD_MET', 'hi', {
        brand: 'Tata',
        model: 'Nexon',
        zone: 'Satara',
        currentSize: 3,
      });

      expect(rendered.subject).toContain('कोरम पूरा हुआ');
      expect(rendered.body).toContain('Satara');
      expect(rendered.body).toContain('3 खरीदारों');
      expect(rendered.body).toContain('48 घंटे की सीलबंद बोली');
    });

    it('renders Marathi templates with rural terminology', () => {
      const rendered = renderTemplate('DELIVERY_HANDOVER', 'mr', {
        model: 'Brezza',
        hubName: 'Baramati Hub',
        otp: '8892',
      });

      expect(rendered.subject).toContain('गाडी आली आहे');
      expect(rendered.body).toContain('PDI वर स्वाक्षरी करा');
      expect(rendered.body).toContain('8892');
    });
  });

  describe('Multi-Channel Dispatch & User Preferences', () => {
    it('dispatches to user preferred channels in preferred language (Marathi)', async () => {
      const results = await service.notify({
        eventId: 'evt-001',
        event: 'GROUP_CREATED',
        userId: 'buyer-demo-01', // Prefers 'mr', SMS, WhatsApp, Email, Push
        variables: {
          brand: 'Mahindra',
          model: 'Scorpio-N',
          zone: 'Baramati',
          targetSize: 5,
        },
        timestamp: new Date().toISOString(),
      });

      expect(results).toHaveLength(4);
      const channels = results.map((r) => r.channel);
      expect(channels).toEqual(expect.arrayContaining(['WHATSAPP', 'SMS', 'EMAIL', 'PUSH']));

      const waResult = results.find((r) => r.channel === 'WHATSAPP');
      expect(waResult?.status).toBe('DELIVERED');
      expect(waResult?.renderedText).toContain('Baramati');
      expect(waResult?.renderedText).toContain('खरेदीदार'); // Marathi text
    });

    it('respects channel overrides in payload', async () => {
      const results = await service.notify({
        eventId: 'evt-002',
        event: 'DELIVERY_HANDOVER',
        userId: 'buyer-demo-hi',
        channels: ['SMS'],
        preferredLanguage: 'hi',
        variables: {
          model: 'Nexon',
          hubName: 'Pune Central Hub',
          otp: '4419',
        },
        timestamp: new Date().toISOString(),
      });

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('SMS');
      expect(results[0].status).toBe('DELIVERED');
      expect(results[0].renderedText).toContain('[GD-RURAL]');
      expect(results[0].renderedText).toContain('4419');
    });
  });

  describe('Retries & Dead-Letter Queue (DLQ) Handling', () => {
    it('retries failing channels 3 times and routes to Dead-Letter Queue if still failing', async () => {
      // Force SMS adapter to simulate telecom failure
      service.smsAdapter.shouldFail = true;

      const results = await service.notify({
        eventId: 'evt-fail-001',
        event: 'BOOKING_CONFIRMED',
        userId: 'buyer-demo-01',
        channels: ['SMS'],
        variables: {
          bookingId: 'bkg-888',
          dealerName: 'Pune Tata Motors',
        },
        timestamp: new Date().toISOString(),
      });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('FAILED');
      expect(results[0].error).toContain('Routed to Dead-Letter Queue');

      // Verify DLQ entry
      const deadLetters = service.getDeadLetters();
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0].channel).toBe('SMS');
      expect(deadLetters[0].retryAttempts).toBe(3);
      expect(deadLetters[0].replayed).toBe(false);
      expect(deadLetters[0].failureReason).toContain('DLT Gateway Error 504');
    });

    it('successfully replays a dead-letter entry once channel recovers', async () => {
      // 1. Fail initially
      service.smsAdapter.shouldFail = true;
      await service.notify({
        eventId: 'evt-fail-002',
        event: 'SHIPMENT_DISPATCHED',
        userId: 'buyer-demo-01',
        channels: ['SMS'],
        variables: { model: 'Nexon', hubName: 'Baramati', etaDays: 2 },
        timestamp: new Date().toISOString(),
      });

      const dlqList = service.getDeadLetters();
      expect(dlqList).toHaveLength(1);
      const dlqId = dlqList[0].id;

      // 2. Channel recovers
      service.smsAdapter.shouldFail = false;

      // 3. Replay from DLQ
      const replayResult = await service.replayDeadLetter(dlqId);
      expect(replayResult?.status).toBe('DELIVERED');
      expect(dlqList[0].replayed).toBe(true);
    });
  });
});
