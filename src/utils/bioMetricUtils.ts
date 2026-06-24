import { Platform } from "react-native";

import { BiometricType } from "@/hooks/biometrics/biometrics.types";

export const getBiometricName = (
  biometryType: BiometricType,
  upperCase?: boolean
): string => {
  let androidFace = "face unlock";
  let androidFingerprint = "fingerprint unlock";
  let biometric = "biometrisch";

  if (upperCase) {
    androidFace = "Face Unlock";
    androidFingerprint = "Fingerprint Unlock";
    biometric = "Biometrisch";
  }

  if (biometryType === BiometricType.FACE) {
    return Platform.OS === "android" ? androidFace : "FaceId";
  }
  if (biometryType === BiometricType.FINGERPRINT) {
    return Platform.OS === "android" ? androidFingerprint : "TouchId";
  }
  return biometric;
};
