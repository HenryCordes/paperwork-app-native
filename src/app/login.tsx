import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Href, useRouter } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { useToast } from "@/hooks/useToast";
import { BiometricOptIn } from "@/components/BiometricOptIn";
import {
  BiometricCredentials,
  BiometricType,
} from "@/hooks/biometrics/biometrics.types";
import { getBiometricName } from "@/utils/bioMetricUtils";
import { secureStorage, RECENT_LOGOUT_KEY } from "@/services/secureStorage";
import { Colors, Spacing } from "@/constants/theme";

export default function Login() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { showToast } = useToast();
  const { login } = useAuth();
  const {
    checkAvailability,
    isBiometricsEnabled,
    getCredentials,
    authenticate,
  } = useBiometrics();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showBiometricOptIn, setShowBiometricOptIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [credentialsStored, setCredentialsStored] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(
    BiometricType.NONE
  );
  const [isAfterLogout, setIsAfterLogout] = useState(false);

  const navigateToDashboard = () => {
    setEmail("");
    setPassword("");
    router.replace("/dashboard");
  };

  const handleBiometricLoginSuccess = async (
    username: string,
    password: string
  ) => {
    try {
      setIsLoggingIn(true);
      const result = await login.mutateAsync({ email: username, password });

      if (!result.token) {
        showToast("Biometrische login mislukt", "error");
        return;
      }

      await secureStorage.removeItem(RECENT_LOGOUT_KEY);
      navigateToDashboard();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Biometrische login mislukt",
        "error"
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectBiometricAuth = async (
    isManualTrigger: boolean,
    knownCredentials?: BiometricCredentials | null,
    knownBiometryType?: BiometricType
  ) => {
    if (!isManualTrigger) {
      const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
      if (recentLogout === "true") {
        return;
      }
    }

    const credentials = knownCredentials ?? (await getCredentials());
    if (!credentials) {
      showToast("Geen opgeslagen inloggegevens gevonden", "error");
      return;
    }

    const type = knownBiometryType ?? biometricType;
    const authenticated = await authenticate({
      reason: "Log in op je Paperwork account",
      title: `${getBiometricName(type, true)} login`,
      subtitle: `Login met ${getBiometricName(type)}`,
      allowDeviceCredential: true,
    });

    if (authenticated) {
      await handleBiometricLoginSuccess(
        credentials.username,
        credentials.password
      );
    }
  };

  // Run once on mount: check recent-logout, then biometric availability +
  // stored credentials, auto-triggering biometric login when everything
  // lines up (skipped on Android and immediately after logout) - same
  // gating as paperwork-app's LoginPage.
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const recentLogout = await secureStorage.getItem(RECENT_LOGOUT_KEY);
      const afterLogout = recentLogout === "true";
      if (!mounted) return;
      setIsAfterLogout(afterLogout);
      if (afterLogout) return;

      const availability = await checkAvailability();
      if (!mounted) return;
      setBiometricAvailable(availability.isAvailable);
      setBiometricType(availability.biometryType || BiometricType.NONE);

      const credentials = await getCredentials();
      if (!mounted) return;
      setCredentialsStored(credentials !== null);

      if (Platform.OS === "android" || !availability.isAvailable) {
        return;
      }

      const enabled = await isBiometricsEnabled();
      if (!mounted || !enabled || !credentials) {
        return;
      }

      handleDirectBiometricAuth(
        false,
        credentials,
        availability.biometryType
      );
    };

    initialize();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs only on mount, mirroring paperwork-app's LoginPage; re-running on dependency changes would re-trigger automatic biometric login unexpectedly
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Vul alstublieft alle velden in", "error");
      return;
    }

    try {
      setIsLoggingIn(true);
      const result = await login.mutateAsync({ email, password });

      if (!result.token) {
        showToast("Login niet succesvol", "error");
        return;
      }

      await secureStorage.removeItem(RECENT_LOGOUT_KEY);

      if (biometricAvailable) {
        const enabled = await isBiometricsEnabled();
        const credentials = await getCredentials();

        if (!enabled || !credentials) {
          setShowBiometricOptIn(true);
          setIsLoggingIn(false);
          return;
        }
      }

      navigateToDashboard();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Een onverwachte fout is opgetreden tijdens het inloggen",
        "error"
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (showBiometricOptIn) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <BiometricOptIn
          username={email}
          password={password}
          onComplete={navigateToDashboard}
          onCancel={navigateToDashboard}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Paperwork</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Email
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.textSecondary },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="Voer je e-mailadres in"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="login-email"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Wachtwoord
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.textSecondary },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Voer je wachtwoord in"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          testID="login-password"
        />
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleLogin}
        disabled={isLoggingIn}
        testID="login-submit"
      >
        <Text style={styles.buttonText}>
          {isLoggingIn ? "Inloggen..." : "Login"}
        </Text>
      </Pressable>

      {isAfterLogout && biometricAvailable && credentialsStored && (
        <Pressable
          style={[
            styles.button,
            styles.outlineButton,
            { borderColor: colors.primary },
          ]}
          onPress={() => handleDirectBiometricAuth(true)}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Login met {getBiometricName(biometricType)}
          </Text>
        </Pressable>
      )}

      <Pressable
        // Cast needed: typed routes don't yet know about "/reset" since the
        // password-reset screen doesn't exist yet (later task).
        onPress={() => router.push("/reset" as Href)}
        style={styles.forgotPassword}
      >
        <Text style={{ color: colors.textSecondary }}>
          Wachtwoord vergeten?{" "}
          <Text style={{ color: colors.primary }}>Wachtwoord wijzigen</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: Spacing.three,
  },
});
