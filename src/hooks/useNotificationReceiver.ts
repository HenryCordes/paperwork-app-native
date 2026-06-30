import { useEffect } from "react";

import {
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";
import { useMarkAsReceived, useMarkAsRead } from "./useNotifications";
import type { NotificationPayload } from "@/api/types/notifications";

export function useNotificationReceiver(): void {
  const { mutate: markAsReceived } = useMarkAsReceived();
  const { mutate: markAsRead } = useMarkAsRead();

  useEffect(() => {
    const handleReceived = (payload: NotificationPayload) => {
      if (payload.notificationId) {
        markAsReceived(payload.notificationId);
      }
    };

    const handleTapped = (payload: NotificationPayload) => {
      if (payload.notificationId) {
        markAsRead({ notificationId: payload.notificationId, read: true });
      }
    };

    const unsubscribeMessage = onForegroundMessage(handleReceived);
    const unsubscribeTap = onNotificationTapped(handleTapped);

    getInitialNotificationTap().then((payload) => {
      if (payload) {
        handleTapped(payload);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTap();
    };
  }, [markAsReceived, markAsRead]);
}

export default useNotificationReceiver;
