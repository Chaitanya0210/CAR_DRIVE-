import { DeliveryResult, NotificationPayload } from '../types';

export class SmsAdapter {
  public readonly channel = 'SMS';
  public shouldFail = false; // test hook

  async send(
    payload: NotificationPayload,
    renderedText: string,
    attempt: number,
  ): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw new Error('Telecom SMS gateway timeout (DLT Gateway Error 504)');
    }

    const recipient = payload.recipientPhone || '+919876543210';
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      channel: 'SMS',
      status: 'DELIVERED',
      externalMessageId: messageId,
      renderedText: `[GD-RURAL] ${renderedText}`,
      attempt,
    };
  }
}
