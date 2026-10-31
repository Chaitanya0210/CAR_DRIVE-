import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationPayload,
  NotificationChannel,
  NotificationLanguage,
  DeliveryResult,
  DeadLetterEntry,
  UserNotificationPreferences,
} from './types';
import { renderTemplate } from './templates';
import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { PushAdapter } from './adapters/push.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  public smsAdapter = new SmsAdapter();
  public whatsappAdapter = new WhatsAppAdapter();
  public emailAdapter = new EmailAdapter();
  public pushAdapter = new PushAdapter();

  // In-memory preference and DLQ stores (backed by DB in production)
  private userPreferences = new Map<string, UserNotificationPreferences>();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private deliveryHistory: DeliveryResult[] = [];

  constructor() {
    this.seedDefaultPreferences();
  }

  private seedDefaultPreferences(): void {
    this.userPreferences.set('buyer-demo-01', {
      userId: 'buyer-demo-01',
      language: 'mr', // Marathi preference
      channels: { sms: true, whatsapp: true, email: true, push: true },
      phone: '+919822012345',
      email: 'buyer.baramati@example.com',
      pushToken: 'fcm_token_demo_01',
    });

    this.userPreferences.set('buyer-demo-hi', {
      userId: 'buyer-demo-hi',
      language: 'hi', // Hindi preference
      channels: { sms: true, whatsapp: true, email: false, push: true },
      phone: '+919811098765',
      email: 'buyer.hindi@example.com',
    });
  }

  public setPreferences(prefs: UserNotificationPreferences): void {
    this.userPreferences.set(prefs.userId, prefs);
  }

  public getPreferences(userId: string): UserNotificationPreferences {
    return (
      this.userPreferences.get(userId) || {
        userId,
        language: 'en',
        channels: { sms: true, whatsapp: true, email: true, push: false },
      }
    );
  }

  /**
   * Main entrypoint: Dispatches an event-driven notification to a user.
   */
  async notify(payload: NotificationPayload): Promise<DeliveryResult[]> {
    const prefs = this.getPreferences(payload.userId);
    const lang: NotificationLanguage = payload.preferredLanguage || prefs.language || 'en';
    const { subject, body } = renderTemplate(payload.event, lang, payload.variables);

    // Determine target channels based on preferences and payload overrides
    const targetChannels: NotificationChannel[] = payload.channels || [];
    if (targetChannels.length === 0) {
      if (prefs.channels.whatsapp) targetChannels.push('WHATSAPP');
      if (prefs.channels.sms) targetChannels.push('SMS');
      if (prefs.channels.email && (payload.recipientEmail || prefs.email))
        targetChannels.push('EMAIL');
      if (prefs.channels.push && (payload.recipientPushToken || prefs.pushToken))
        targetChannels.push('PUSH');
    }

    const results: DeliveryResult[] = [];

    for (const channel of targetChannels) {
      const result = await this.deliverWithRetry(channel, payload, subject, body);
      results.push(result);
      this.deliveryHistory.push(result);
    }

    return results;
  }

  /**
   * Delivers via channel with exponential backoff retries and Dead-Letter Queue (DLQ) routing.
   */
  private async deliverWithRetry(
    channel: NotificationChannel,
    payload: NotificationPayload,
    subject: string | undefined,
    body: string,
    maxRetries = 3,
  ): Promise<DeliveryResult> {
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let result: DeliveryResult;
        switch (channel) {
          case 'SMS':
            result = await this.smsAdapter.send(payload, body, attempt);
            break;
          case 'WHATSAPP':
            result = await this.whatsappAdapter.send(payload, body, attempt);
            break;
          case 'EMAIL':
            result = await this.emailAdapter.send(payload, subject, body, attempt);
            break;
          case 'PUSH':
            result = await this.pushAdapter.send(payload, subject, body, attempt);
            break;
        }

        this.logger.log(
          `[Notification Delivered] ${channel} for ${payload.event} (Attempt ${attempt})`,
        );
        return result;
      } catch (err: any) {
        lastError = err.message || 'Delivery error';
        this.logger.warn(
          `[Notification Attempt ${attempt} Failed] ${channel} for ${payload.event}: ${lastError}`,
        );

        if (attempt < maxRetries) {
          // Exponential backoff delay (simulated or non-blocking)
          await new Promise((r) => setTimeout(r, Math.min(attempt * 50, 200)));
        }
      }
    }

    // Exhausted retries -> Route to Dead-Letter Queue (DLQ)
    const dlqEntry: DeadLetterEntry = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payload,
      channel,
      failureReason: lastError,
      retryAttempts: maxRetries,
      lastAttemptAt: new Date().toISOString(),
      replayed: false,
    };

    this.deadLetterQueue.push(dlqEntry);
    this.logger.error(
      `[Notification Routed to DLQ] ${channel} failed after ${maxRetries} attempts: ${lastError}`,
    );

    return {
      channel,
      status: 'FAILED',
      renderedText: body,
      error: `Failed after ${maxRetries} attempts. Routed to Dead-Letter Queue: ${lastError}`,
      attempt: maxRetries,
    };
  }

  /**
   * DLQ Inspection
   */
  public getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Replays a dead-letter entry
   */
  public async replayDeadLetter(dlqId: string): Promise<DeliveryResult | null> {
    const entry = this.deadLetterQueue.find((e) => e.id === dlqId);
    if (!entry) return null;

    const { subject, body } = renderTemplate(
      entry.payload.event,
      entry.payload.preferredLanguage || 'en',
      entry.payload.variables,
    );

    const result = await this.deliverWithRetry(entry.channel, entry.payload, subject, body, 1);
    if (result.status === 'DELIVERED') {
      entry.replayed = true;
    }
    return result;
  }

  public getHistory(): DeliveryResult[] {
    return [...this.deliveryHistory];
  }

  public clear(): void {
    this.deadLetterQueue = [];
    this.deliveryHistory = [];
  }
}
