import { useCallback } from "react";

import { BiometricsService } from "./biometrics.service";
import {
  BiometricAuthOptions,
  BiometricAvailability,
  BiometricCredentials,
  UseBiometrics,
} from "./biometrics.types";

const biometricsService = new BiometricsService();

export const useBiometrics = (): UseBiometrics => {
  const checkAvailability = useCallback(
    (): Promise<BiometricAvailability> =>
      biometricsService.checkAvailability(),
    []
  );

  const authenticate = useCallback(
    (options: BiometricAuthOptions): Promise<boolean> =>
      biometricsService.authenticate(options),
    []
  );

  const saveCredentials = useCallback(
    (credentials: BiometricCredentials): Promise<boolean> =>
      biometricsService.saveCredentials(credentials),
    []
  );

  const getCredentials = useCallback(
    (): Promise<BiometricCredentials | null> =>
      biometricsService.getCredentials(),
    []
  );

  const clearCredentials = useCallback(
    (): Promise<void> => biometricsService.clearCredentials(),
    []
  );

  const isBiometricsEnabled = useCallback(
    (): Promise<boolean> => biometricsService.isBiometricsEnabled(),
    []
  );

  const setBiometricsEnabled = useCallback(
    (enabled: boolean): Promise<void> =>
      biometricsService.setBiometricsEnabled(enabled),
    []
  );

  return {
    checkAvailability,
    authenticate,
    saveCredentials,
    getCredentials,
    clearCredentials,
    isBiometricsEnabled,
    setBiometricsEnabled,
  };
};

export default useBiometrics;
