import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import {
  checkPermissions,
  requestPermissions as requestFCMPermissions,
  getToken,
  onTokenRefreshed,
} from "@/services/firebase-messaging.service";
import { secureStorage } from "@/services/secureStorage";
import { useNotificationTokens, useNotificationSettings } from "./useNotifications";
import type {
  NotificationPermissionStatus,
  PushNotificationSettings,
} from "@/api/types/notifications";

const PUSH_SETTINGS_KEY = "push_notification_settings";

const DEFAULT_SETTINGS: PushNotificationSettings = { enabled: false };

export function usePushNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true,
  });
  const [settings, setSettings] = useState<PushNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { registerToken } = useNotificationTokens();
  const { updateSettings: updateApiSettings } = useNotificationSettings();

  useEffect(() => {
    secureStorage.getItem(PUSH_SETTINGS_KEY).then((stored) => {
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    });
  }, []);

  const registerCurrentPlatformToken = useCallback(
    (token: string) => {
      registerToken({ token, platform: Platform.OS as "ios" | "android" });
    },
    [registerToken],
  );

  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      setLoading(true);
      setError(null);

      let status = await checkPermissions();
      if (status.prompt) {
        status = await requestFCMPermissions();
      }
      setPermissionStatus(status);

      if (!status.granted) {
        setIsInitialized(true);
        return;
      }

      const token = await getToken();
      setFcmToken(token);
      setIsInitialized(true);
      registerCurrentPlatformToken(token);
    } catch {
      setError("Kon push notificaties niet initialiseren");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, registerCurrentPlatformToken]);

  useEffect(() => {
    return onTokenRefreshed((token) => {
      setFcmToken(token);
      registerCurrentPlatformToken(token);
    });
  }, [registerCurrentPlatformToken]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const status = await requestFCMPermissions();
      setPermissionStatus(status);
      return status.granted;
    } catch {
      setError("Kon notificatie-permissies niet aanvragen");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      setFcmToken(token);
      registerCurrentPlatformToken(token);
      return token;
    } catch {
      setError("Kon FCM token niet vernieuwen");
      return null;
    } finally {
      setLoading(false);
    }
  }, [registerCurrentPlatformToken]);

  const updateSettings = useCallback(
    async (newSettings: PushNotificationSettings) => {
      setSettings(newSettings);
      await secureStorage.setItem(PUSH_SETTINGS_KEY, JSON.stringify(newSettings));
      updateApiSettings({ enabled: newSettings.enabled });
    },
    [updateApiSettings],
  );

  return {
    isInitialized,
    fcmToken,
    permissionStatus,
    settings,
    loading,
    error,
    initialize,
    requestPermissions,
    refreshToken,
    updateSettings,
  };
}

export default usePushNotifications;
