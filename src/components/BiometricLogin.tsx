import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import { Colors, Spacing } from "@/constants/theme";

interface BiometricLoginProps {
  onLoginSuccess: (username: string, password: string) => void;
  onCancel: () => void;
  autoPrompt?: boolean;
}

export function BiometricLogin({
  onLoginSuccess,
  onCancel,
  autoPrompt = true,
}: BiometricLoginProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const {
    authenticate,
    checkAvailability,
    getCredentials,
    isBiometricsEnabled,
  } = useBiometrics();

  const [biometryType, setBiometryType] = useState<BiometricType>(
    BiometricType.NONE
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      const enabled = await isBiometricsEnabled();
      if (!enabled) {
        setLoading(false);
        onCancel();
        return;
      }

      const availability = await checkAvailability();
      if (!availability.isAvailable) {
        setError(
          "Biometrische verificatie is niet beschikbaar op dit toestel"
        );
        setLoading(false);
        return;
      }

      setBiometryType(availability.biometryType || BiometricType.NONE);
      setShowPrompt(true);
      setLoading(false);
    };
    checkStatus();
  }, [checkAvailability, isBiometricsEnabled, onCancel]);

  const handleAuthenticate = useCallback(async () => {
    setError(null);
    try {
      const authenticated = await authenticate({
        reason: "Log in op je Paperwork account",
        title: `${getBiometricName(biometryType, true)} login`,
        subtitle: `Login met ${getBiometricName(biometryType)}`,
        allowDeviceCredential: true,
      });

      if (authenticated) {
        const credentials = await getCredentials();
        if (credentials) {
          onLoginSuccess(credentials.username, credentials.password);
        } else {
          setError("Geen opgeslagen inloggegevens gevonden");
        }
      } else {
        setError("Biometrische verificatie mislukt of geannuleerd");
      }
    } catch {
      setError("Authenticatie mislukt");
    }
  }, [authenticate, biometryType, getCredentials, onLoginSuccess]);

  useEffect(() => {
    // Skip auto-prompt on Android - same dialog-loop avoidance as every
    // other Android exclusion in this phase.
    const shouldAutoPrompt = autoPrompt && Platform.OS !== "android";
    if (showPrompt && shouldAutoPrompt) {
      handleAuthenticate();
    }
  }, [showPrompt, autoPrompt, handleAuthenticate]);

  if (loading) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={{ color: colors.text }}>Biometrie controleren...</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundElement }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Login met {getBiometricName(biometryType, true)}
      </Text>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleAuthenticate}
      >
        <Text style={styles.buttonText}>
          Gebruik {getBiometricName(biometryType, true)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
