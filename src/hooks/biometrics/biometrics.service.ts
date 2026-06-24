import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import {
  secureStorage,
  BIOMETRICS_ENABLED_KEY,
  BIOMETRICS_USERNAME_KEY,
  BIOMETRICS_PASSWORD_KEY,
} from "@/services/secureStorage";

import {
  BiometricAuthOptions,
  BiometricAvailability,
  BiometricCredentials,
  BiometricType,
} from "./biometrics.types";

function toAppBiometricType(
  types: LocalAuthentication.AuthenticationType[]
): BiometricType {
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return BiometricType.FACE;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return BiometricType.FINGERPRINT;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return BiometricType.IRIS;
  }
  return BiometricType.NONE;
}

export class BiometricsService {
  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometryType = toAppBiometricType(supportedTypes);

      return {
        isAvailable: hasHardware && isEnrolled,
        biometryType,
        canUseFaceID: biometryType === BiometricType.FACE,
        canUseFingerprint: biometryType === BiometricType.FINGERPRINT,
        canUseIris: biometryType === BiometricType.IRIS,
      };
    } catch (error) {
      return {
        isAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async authenticate(options: BiometricAuthOptions): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.reason,
        cancelLabel: options.cancelTitle,
        disableDeviceFallback: options.allowDeviceCredential === false,
      });

      if (result.success) {
        return true;
      }

      // iOS system-cancel is retryable (paperwork-app treats it as
      // non-fatal so the OS can re-prompt); Android cancel of any kind is
      // not, consistent with Android being excluded from the automatic
      // biometric path throughout this phase.
      if (result.error === "system_cancel" && Platform.OS !== "android") {
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  async saveCredentials(credentials: BiometricCredentials): Promise<boolean> {
    try {
      await secureStorage.setItem(
        BIOMETRICS_USERNAME_KEY,
        credentials.username
      );
      await secureStorage.setItem(
        BIOMETRICS_PASSWORD_KEY,
        credentials.password
      );
      return true;
    } catch {
      return false;
    }
  }

  async clearCredentials(): Promise<void> {
    await secureStorage.removeItem(BIOMETRICS_USERNAME_KEY);
    await secureStorage.removeItem(BIOMETRICS_PASSWORD_KEY);
  }

  async getCredentials(): Promise<BiometricCredentials | null> {
    const username = await secureStorage.getItem(BIOMETRICS_USERNAME_KEY);
    const password = await secureStorage.getItem(BIOMETRICS_PASSWORD_KEY);

    if (!username || !password) {
      return null;
    }

    return { username, password };
  }

  async isBiometricsEnabled(): Promise<boolean> {
    const value = await secureStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return value === "true";
  }

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItem(
      BIOMETRICS_ENABLED_KEY,
      enabled ? "true" : "false"
    );
  }
}
