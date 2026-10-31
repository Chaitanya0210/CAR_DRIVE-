import { DeliveryResult, NotificationPayload } from '../types';

export class WhatsAppAdapter {
  public readonly channel = 'WHATSAPP';
  public shouldFail = false; // test hook

  async send(
    payload: NotificationPayload,
    renderedText: string,
    attempt: number,
  ): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw new Error('Meta WhatsApp Cloud API rate limit (Error code 131053)');
    }

    const recipient = payload.recipientPhone || '+919876543210';
    const messageId = `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      channel: 'WHATSAPP',
      status: 'DELIVERED',
      externalMessageId: messageId,
      renderedText: `🟢 *GroupDrive Verified Update*\n\n${renderedText}\n\n_Reply 1 to connect with rural coordinator_`,
      attempt,
    };
  }
}
