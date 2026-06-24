import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { Colors, Spacing } from "@/constants/theme";

interface BiometricOptInProps {
  username: string;
  password: string;
  onComplete: (enableBiometrics: boolean) => void;
  onCancel: () => void;
}

export function BiometricOptIn({
  username,
  password,
  onComplete,
  onCancel,
}: BiometricOptInProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { checkAvailability, saveCredentials, setBiometricsEnabled } =
    useBiometrics();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState(
    "Biometrische verificatie"
  );
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAvailability()
      .then((result) => {
        setBiometricAvailable(result.isAvailable);
        if (result.canUseFaceID) {
          setBiometricLabel("Face Recognition");
        } else if (result.canUseFingerprint) {
          setBiometricLabel("Fingerprint");
        }
      })
      .finally(() => setLoading(false));
  }, [checkAvailability]);

  const handleSavePreference = async () => {
    if (enableBiometrics) {
      await saveCredentials({ username, password });
      await setBiometricsEnabled(true);
    }
    onComplete(enableBiometrics);
  };

  if (loading) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={{ color: colors.text }}>Biometrie controleren...</Text>
      </View>
    );
  }

  if (!biometricAvailable) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Biometrie niet beschikbaar
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          Je toestel ondersteunt geen biometrische verificatie of het is niet
          ingesteld.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => onComplete(false)}
        >
          <Text style={styles.buttonText}>Doorgaan zonder biometrie</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundElement }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {biometricLabel} inschakelen
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={{ color: colors.textSecondary, fontSize: 20 }}>×</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.textSecondary }}>
        Gebruik {biometricLabel} om snel en veilig in te loggen zonder je
        wachtwoord te typen.
      </Text>
      <View style={styles.row}>
        <Text style={{ color: colors.text }}>
          {biometricLabel} inschakelen
        </Text>
        <Switch value={enableBiometrics} onValueChange={setEnableBiometrics} />
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSavePreference}
      >
        <Text style={styles.buttonText}>Doorgaan</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
