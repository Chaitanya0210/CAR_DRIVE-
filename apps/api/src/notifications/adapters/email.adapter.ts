import { DeliveryResult, NotificationPayload } from '../types';

export class EmailAdapter {
  public readonly channel = 'EMAIL';
  public shouldFail = false; // test hook

  async send(
    payload: NotificationPayload,
    subject: string | undefined,
    renderedText: string,
    attempt: number,
  ): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw new Error('SMTP connection reset by peer (SendGrid 421)');
    }

    const recipient = payload.recipientEmail || 'buyer@example.com';
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@groupdrive.in`;

    return {
      channel: 'EMAIL',
      status: 'DELIVERED',
      externalMessageId: messageId,
      renderedText: `Subject: ${subject || 'GroupDrive Notification'}\n\n${renderedText}`,
      attempt,
    };
  }
}
