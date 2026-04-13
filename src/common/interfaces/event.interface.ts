export interface INexusEvent {
  eventId: string;
  tenantId: string;
  eventType: string;
  source: string;
  timestamp: number;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export enum NexusEventType {
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_SIGNUP = 'user.signup',
  USER_UPDATED = 'user.updated',
  PAGE_VIEW = 'page.view',
  ORDER_PLACED = 'order.placed',
  ORDER_UPDATED = 'order.updated',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
  SYSTEM_ERROR = 'system.error',
  SYSTEM_ALERT = 'system.alert',
  MOCK_EVENT = 'mock.event',
}
