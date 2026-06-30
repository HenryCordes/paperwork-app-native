import { useLayoutEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useSettings, useVatPreferences } from "@/hooks/useSettings";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";

export default function Settings() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();

  const { data: settingsData, isLoading, isError, error } = useSettings();
  const { data: vatData } = useVatPreferences();

  const settings = settingsData?.data;
  const vatPrefs = vatData?.data;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Instellingen",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      headerRight: () => (
        <Pressable
          testID="settings-edit-button"
          accessibilityLabel="Bewerken"
          onPress={() => router.push("/settings/edit")}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, router, colors.background, colors.text, colors.primary]);

  if (isLoading) {
    return (
      <View
        testID="settings-loading"
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.danger }]}>
          Fout bij ophalen instellingen: {error?.message || "Onbekende fout"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="settings-details-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Card bordered style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bedrijfsinformatie</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Bedrijfsnaam</Text>
          <Text style={{ color: colors.text }}>{settings?.companyName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>E-mail</Text>
          <Text style={{ color: colors.text }}>{settings?.companyEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Telefoonnummer</Text>
          <Text style={{ color: colors.text }}>{settings?.phoneNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Website</Text>
          <Text style={{ color: colors.text }}>{settings?.website || "-"}</Text>
        </View>
      </Card>

      <Card bordered style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Adresgegevens</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Straat</Text>
          <Text style={{ color: colors.text }}>{settings?.street}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Huisnummer</Text>
          <Text style={{ color: colors.text }}>{settings?.houseNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Postcode</Text>
          <Text style={{ color: colors.text }}>{settings?.postalCode}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Plaats</Text>
          <Text style={{ color: colors.text }}>{settings?.city}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Land</Text>
          <Text style={{ color: colors.text }}>{settings?.country}</Text>
        </View>
      </Card>

      <Card bordered style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Financiële Informatie</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Valuta</Text>
          <Text style={{ color: colors.text }}>{settings?.currency}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>BTW Percentage</Text>
          <Text style={{ color: colors.text }}>{settings?.taxPercentage}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>BTW Nummer</Text>
          <Text style={{ color: colors.text }}>{settings?.taxNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>KVK Nummer</Text>
          <Text style={{ color: colors.text }}>{settings?.chamberOfCommerceNumber}</Text>
        </View>
      </Card>

      <Card bordered style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bankgegevens</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>Banknaam</Text>
          <Text style={{ color: colors.text }}>{settings?.bankName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>IBAN</Text>
          <Text style={{ color: colors.text }}>{settings?.bankIBAN}</Text>
        </View>
      </Card>

      {vatPrefs !== undefined ? (
        <Card bordered style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>BTW Notificatievoorkeuren</Text>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>E-mail notificaties</Text>
            <Switch
              testID="vat-email-notifications"
              value={vatPrefs.emailNotifications}
              disabled
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>Push notificaties</Text>
            <Switch
              testID="vat-push-notifications"
              value={vatPrefs.pushNotifications}
              disabled
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>Kwartaalnotificaties</Text>
            <Switch
              testID="vat-quarterly-notifications"
              value={vatPrefs.quarterlyNotifications}
              disabled
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>Maandelijkse notificaties</Text>
            <Switch
              testID="vat-monthly-notifications"
              value={vatPrefs.monthlyNotifications}
              disabled
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>Jaarlijkse notificaties</Text>
            <Switch
              testID="vat-yearly-notifications"
              value={vatPrefs.yearlyNotifications}
              disabled
            />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.one,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  error: {
    textAlign: "center",
  },
});
