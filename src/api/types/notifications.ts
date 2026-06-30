export interface FCMTokenRequest {
  token: string;
  platform: "ios" | "android";
}

export interface FCMTokenResponse {
  success: boolean;
  message: string;
}

export interface NotificationSettingsRequest {
  enabled: boolean;
}

export interface NotificationSettingsResponse {
  success: boolean;
  message: string;
}

export interface FCMTokenInfo {
  platform: string;
  createdAt: string;
  lastUsed: string;
}

export interface GetTokensResponse {
  success: boolean;
  data: FCMTokenInfo[];
}

export type NotificationType = "expense" | "invoice" | "vat_deadline" | "general";
export type NotificationAction = "view" | "edit";

export interface StoredNotification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetId?: string;
  action?: NotificationAction;
  read: boolean;
  received: boolean;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationListResponse {
  success: boolean;
  data: StoredNotification[];
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  data: StoredNotification;
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}

export interface DeleteNotificationResponse {
  success: boolean;
}

export interface NotificationFilter {
  status?: "all" | "unread" | "read";
  type?: NotificationType;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  notificationId?: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationSettings {
  enabled: boolean;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}
