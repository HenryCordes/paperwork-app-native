import { Platform } from "react-native";

import { getBiometricName } from "@/utils/bioMetricUtils";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";

describe("getBiometricName", () => {
  afterEach(() => {
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
  });

  it("returns FaceId on iOS for FACE", () => {
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
    expect(getBiometricName(BiometricType.FACE)).toBe("FaceId");
  });

  it("returns a lowercase Dutch-context fallback on Android for FACE", () => {
    Object.defineProperty(Platform, "OS", { get: () => "android" });
    expect(getBiometricName(BiometricType.FACE)).toBe("face unlock");
  });

  it("respects the upperCase flag on Android for FINGERPRINT", () => {
    Object.defineProperty(Platform, "OS", { get: () => "android" });
    expect(getBiometricName(BiometricType.FINGERPRINT, true)).toBe(
      "Fingerprint Unlock"
    );
  });

  it("falls back to a generic name for NONE", () => {
    expect(getBiometricName(BiometricType.NONE)).toBe("biometrisch");
  });
});
