import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  hasPermission,
  requestPermission,
  getToken as fetchFCMToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
  type FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";

import type {
  NotificationPayload,
  NotificationPermissionStatus,
} from "@/api/types/notifications";

const messaging = getMessaging(getApp());

function toPermissionStatus(status: number): NotificationPermissionStatus {
  return {
    granted:
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL,
    denied: status === AuthorizationStatus.DENIED,
    prompt: status === AuthorizationStatus.NOT_DETERMINED,
  };
}

export async function checkPermissions(): Promise<NotificationPermissionStatus> {
  return toPermissionStatus(await hasPermission(messaging));
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return toPermissionStatus(await requestPermission(messaging));
}

export async function getToken(): Promise<string> {
  return fetchFCMToken(messaging);
}

function parseNotificationPayload(
  message: FirebaseMessagingTypes.RemoteMessage,
): NotificationPayload {
  const data = (message.data ?? {}) as Record<string, unknown>;
  return {
    id: (data.id as string) ?? message.messageId ?? Date.now().toString(),
    title: message.notification?.title ?? "Paperwork Notificatie",
    body: message.notification?.body ?? "",
    notificationId: data.notificationId as string | undefined,
    data,
  };
}

export function onTokenRefreshed(handler: (token: string) => void): () => void {
  return onTokenRefresh(messaging, handler);
}

export function onForegroundMessage(
  handler: (payload: NotificationPayload) => void,
): () => void {
  return onMessage(messaging, (message) => handler(parseNotificationPayload(message)));
}

export function onNotificationTapped(
  handler: (payload: NotificationPayload) => void,
): () => void {
  return onNotificationOpenedApp(messaging, (message) => handler(parseNotificationPayload(message)));
}

export async function getInitialNotificationTap(): Promise<NotificationPayload | null> {
  const message = await getInitialNotification(messaging);
  return message ? parseNotificationPayload(message) : null;
}
