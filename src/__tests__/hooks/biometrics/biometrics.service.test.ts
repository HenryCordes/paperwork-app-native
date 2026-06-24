import * as LocalAuthentication from "expo-local-authentication";

import { BiometricsService } from "@/hooks/biometrics/biometrics.service";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import {
  secureStorage,
  BIOMETRICS_USERNAME_KEY,
  BIOMETRICS_PASSWORD_KEY,
  BIOMETRICS_ENABLED_KEY,
} from "@/services/secureStorage";

jest.mock("expo-local-authentication");
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  BIOMETRICS_USERNAME_KEY: "nl.paperwork.app.auth_username",
  BIOMETRICS_PASSWORD_KEY: "nl.paperwork.app.auth_password",
  BIOMETRICS_ENABLED_KEY: "biometrics_enabled",
}));

describe("BiometricsService", () => {
  const service = new BiometricsService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAvailability", () => {
    it("reports available with face type when hardware, enrollment, and face type are present", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        true
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        true
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await service.checkAvailability();

      expect(result).toEqual({
        isAvailable: true,
        biometryType: BiometricType.FACE,
        canUseFaceID: true,
        canUseFingerprint: false,
        canUseIris: false,
      });
    });

    it("reports unavailable when there's no hardware", async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        false
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        false
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.checkAvailability();
      expect(result.isAvailable).toBe(false);
    });
  });

  describe("authenticate", () => {
    it("returns true on success", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });
      expect(await service.authenticate({ reason: "test" })).toBe(true);
    });

    it("returns false on failure", async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: "user_cancel",
      });
      expect(await service.authenticate({ reason: "test" })).toBe(false);
    });
  });

  describe("credentials", () => {
    it("saves username and password", async () => {
      const saved = await service.saveCredentials({
        username: "a@b.com",
        password: "pw",
      });
      expect(saved).toBe(true);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_USERNAME_KEY,
        "a@b.com"
      );
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_PASSWORD_KEY,
        "pw"
      );
    });

    it("returns null when either credential is missing", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("a@b.com");
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      expect(await service.getCredentials()).toBeNull();
    });

    it("returns stored credentials when both exist", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("a@b.com");
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce("pw");
      expect(await service.getCredentials()).toEqual({
        username: "a@b.com",
        password: "pw",
      });
    });
  });

  describe("enabled flag", () => {
    it("isBiometricsEnabled reflects the stored flag", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue("true");
      expect(await service.isBiometricsEnabled()).toBe(true);
    });

    it("setBiometricsEnabled stores the flag as a string", async () => {
      await service.setBiometricsEnabled(true);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        BIOMETRICS_ENABLED_KEY,
        "true"
      );
    });
  });
});
