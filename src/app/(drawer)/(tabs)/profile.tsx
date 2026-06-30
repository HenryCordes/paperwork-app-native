import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useNavigation } from "expo-router";

import { useProfile } from "@/hooks/useProfile";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function Profile() {
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const fieldStyle = [styles.field, { borderBottomColor: colors.border }];

  const { data: profile, isLoading, isError, error } = useProfile();
  const { checkAvailability, isBiometricsEnabled, setBiometricsEnabled } =
    useBiometrics();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometricType>(BiometricType.NONE);
  const [isBiometricsOn, setIsBiometricsOn] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Profiel" });
  }, [navigation]);

  useEffect(() => {
    const initBiometrics = async () => {
      try {
        const result = await checkAvailability();
        setBiometricAvailable(result.isAvailable);
        setBiometryType(result.biometryType ?? BiometricType.NONE);

        const enabled = await isBiometricsEnabled();
        setIsBiometricsOn(enabled);
      } catch {
        // silently ignore — biometrics not available or permissions denied
      }
    };

    initBiometrics();
  }, [checkAvailability, isBiometricsEnabled]);

  const handleBiometricToggle = async (value: boolean) => {
    setIsBiometricsOn(value);
    await setBiometricsEnabled(value);
  };

  const errorMessage =
    error instanceof Error ? error.message : "Kon profielgegevens niet laden";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {isLoading && (
        <View testID="profile-loading" style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && (
        <Card>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {errorMessage}
          </Text>
        </Card>
      )}

      {profile && (
        <Card>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile.name}
          </Text>

          <View style={fieldStyle}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Naam
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {profile.name}
            </Text>
          </View>

          <View style={fieldStyle}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Bedrijf
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {profile.companyName}
            </Text>
          </View>

          <View style={fieldStyle}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {profile.email}
            </Text>
          </View>

          <View style={fieldStyle}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Rol
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {profile.role}
            </Text>
          </View>

          <View style={fieldStyle}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Account aangemaakt
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {formatDate(profile.createdAt)}
            </Text>
          </View>

          {biometricAvailable && biometryType !== BiometricType.NONE && (
            <View style={fieldStyle}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Biometrische login
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    Log in met {getBiometricName(biometryType)}
                  </Text>
                </View>
                <Switch
                  testID="biometric-toggle"
                  value={isBiometricsOn}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.three,
  },
  field: {
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
  },
});
