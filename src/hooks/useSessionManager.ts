import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useRouter } from "expo-router";

import { useBiometrics } from "./biometrics/useBiometrics";
import { useAuth } from "./useAuth";
import { BiometricType } from "./biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import {
  secureStorage,
  LAST_ACTIVE_KEY,
  RECENT_LOGOUT_KEY,
  SESSION_TIMEOUT_KEY,
  AUTH_IN_PROGRESS_KEY,
} from "@/services/secureStorage";

// Ported from paperwork-app's src/common/versionConstants.ts.
const DEFAULT_SESSION_TIMEOUT = 15;

export const useSessionManager = () => {
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(
    DEFAULT_SESSION_TIMEOUT
  );
  const {
    isBiometricsEnabled,
    authenticate,
    getCredentials,
    checkAvailability,
  } = useBiometrics();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const loadSessionTimeout = async () => {
      const stored = await secureStorage.getItem(SESSION_TIMEOUT_KEY);
      if (stored === null) {
        await secureStorage.setItem(
          SESSION_TIMEOUT_KEY,
          DEFAULT_SESSION_TIMEOUT.toString()
        );
        setSessionTimeoutMinutes(DEFAULT_SESSION_TIMEOUT);
        return;
      }
      setSessionTimeoutMinutes(parseInt(stored, 10));
    };
    loadSessionTimeout();
  }, []);

  const updateLastActive = useCallback(async () => {
    await secureStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }, []);

  const checkSessionTimeout = useCallback(async (): Promise<boolean> => {
    const lastActiveValue = await secureStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveValue === null) {
      return false;
    }
    const lastActive = parseInt(lastActiveValue, 10);
    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    return Date.now() - lastActive > timeoutMs;
  }, [sessionTimeoutMinutes]);

  const saveSessionTimeout = useCallback(async (minutes: number) => {
    await secureStorage.setItem(SESSION_TIMEOUT_KEY, minutes.toString());
    setSessionTimeoutMinutes(minutes);
  }, []);

  const setAuthInProgress = useCallback(async (inProgress: boolean) => {
    await secureStorage.setItem(AUTH_IN_PROGRESS_KEY, inProgress.toString());
  }, []);

  const checkAuthInProgress = useCallback(async (): Promise<boolean> => {
    return (await secureStorage.getItem(AUTH_IN_PROGRESS_KEY)) === "true";
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    if (await checkAuthInProgress()) {
      return;
    }
    await setAuthInProgress(true);

    if (Platform.OS === "android") {
      return;
    }

    const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
    if (recentLogout === "true") {
      return;
    }

    if (!(await isBiometricsEnabled())) {
      return;
    }

    const credentials = await getCredentials();
    if (!credentials) {
      return;
    }

    const availability = await checkAvailability();
    const biometryType = availability.biometryType || BiometricType.NONE;

    const authenticated = await authenticate({
      reason: "Verifieer je identiteit om door te gaan",
      title: `${getBiometricName(biometryType, true)} login`,
      subtitle: `Login met ${getBiometricName(biometryType)}`,
      allowDeviceCredential: true,
    });

    if (authenticated) {
      await setAuthInProgress(false);
      await secureStorage.removeItem(RECENT_LOGOUT_KEY);

      try {
        await login.mutateAsync({
          email: credentials.username,
          password: credentials.password,
        });
        await updateLastActive();
      } catch {
        // Stored credentials no longer valid - fall through to manual
        // login rather than retrying silently.
      }
    } else {
      router.replace("/login");
      await setAuthInProgress(false);
    }
  }, [
    checkAuthInProgress,
    setAuthInProgress,
    isBiometricsEnabled,
    getCredentials,
    checkAvailability,
    authenticate,
    login,
    updateLastActive,
    router,
  ]);

  useEffect(() => {
    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state === "active") {
        const hasTimedOut = await checkSessionTimeout();
        if (hasTimedOut) {
          handleBiometricAuth();
        } else {
          updateLastActive();
        }
      } else {
        updateLastActive();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    const initialCheck = async () => {
      const hasTimedOut = await checkSessionTimeout();
      if (hasTimedOut) {
        handleBiometricAuth();
      } else {
        updateLastActive();
      }
    };
    initialCheck();

    return () => {
      subscription.remove();
    };
  }, [checkSessionTimeout, handleBiometricAuth, updateLastActive]);

  useEffect(() => {
    secureStorage.removeItem(AUTH_IN_PROGRESS_KEY);
  }, []);

  return {
    sessionTimeoutMinutes,
    saveSessionTimeout,
    updateLastActive,
  };
};

export default useSessionManager;
