export type NotificationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';

export type NotificationLanguage = 'en' | 'hi' | 'mr';

export type NotificationEvent =
  | 'GROUP_CREATED'
  | 'MEMBER_JOINED'
  | 'THRESHOLD_MET'
  | 'RFQ_OPEN'
  | 'BID_SUBMITTED'
  | 'VOTING_OPEN'
  | 'WINNER_SELECTED'
  | 'BOOKING_CONFIRMED'
  | 'SHIPMENT_DISPATCHED'
  | 'DELIVERY_HANDOVER';

export interface UserNotificationPreferences {
  userId: string;
  language: NotificationLanguage;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
    push: boolean;
  };
  phone?: string;
  email?: string;
  pushToken?: string;
}

export interface NotificationPayload {
  eventId: string;
  event: NotificationEvent;
  userId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientPushToken?: string;
  preferredLanguage?: NotificationLanguage;
  channels?: NotificationChannel[];
  variables: Record<string, string | number>;
  timestamp: string;
}

export interface DeliveryResult {
  channel: NotificationChannel;
  status: 'DELIVERED' | 'FAILED';
  externalMessageId?: string;
  renderedText: string;
  error?: string;
  attempt: number;
}

export interface DeadLetterEntry {
  id: string;
  payload: NotificationPayload;
  channel: NotificationChannel;
  failureReason: string;
  retryAttempts: number;
  lastAttemptAt: string;
  replayed: boolean;
}
