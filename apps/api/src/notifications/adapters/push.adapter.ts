import { DeliveryResult, NotificationPayload } from '../types';

export class PushAdapter {
  public readonly channel = 'PUSH';
  public shouldFail = false; // test hook

  async send(
    payload: NotificationPayload,
    title: string | undefined,
    renderedText: string,
    attempt: number,
  ): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw new Error('FCM push token expired or unregistered (UNREGISTERED)');
    }

    const token = payload.recipientPushToken || 'fcm_mock_token_abc123';
    const messageId = `push_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      channel: 'PUSH',
      status: 'DELIVERED',
      externalMessageId: messageId,
      renderedText: `[Push: ${title || 'GroupDrive'}] ${renderedText}`,
      attempt,
    };
  }
}
