export enum BiometricType {
  NONE = "none",
  FINGERPRINT = "fingerprint",
  FACE = "face",
  IRIS = "iris",
}

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType?: BiometricType;
  canUseFaceID?: boolean;
  canUseFingerprint?: boolean;
  canUseIris?: boolean;
  error?: string;
}

export interface BiometricCredentials {
  username: string;
  password: string;
}

export interface BiometricAuthOptions {
  reason: string;
  title?: string;
  subtitle?: string;
  cancelTitle?: string;
  allowDeviceCredential?: boolean;
}

export interface UseBiometrics {
  checkAvailability: () => Promise<BiometricAvailability>;
  authenticate: (options: BiometricAuthOptions) => Promise<boolean>;
  saveCredentials: (credentials: BiometricCredentials) => Promise<boolean>;
  getCredentials: () => Promise<BiometricCredentials | null>;
  clearCredentials: () => Promise<void>;
  isBiometricsEnabled: () => Promise<boolean>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
}
