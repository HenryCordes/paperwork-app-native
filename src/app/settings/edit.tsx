import { useEffect, useLayoutEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
  Pressable,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useSettings, useUpdateSettings, useVatPreferences, useUpdateVatPreferences } from "@/hooks/useSettings";
import { SettingsUpdateRequest } from "@/api/types/settings";
import { VatNotificationPreferencesUpdateRequest } from "@/api/types/vatNotificationPreferences";
import { Colors, Spacing } from "@/constants/theme";

export default function SettingsEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();

  const [formData, setFormData] = useState<SettingsUpdateRequest>({});
  const [vatFormData, setVatFormData] = useState<VatNotificationPreferencesUpdateRequest>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: settingsData } = useSettings();
  const { data: vatData } = useVatPreferences();
  const updateSettings = useUpdateSettings();
  const updateVatPreferences = useUpdateVatPreferences();

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-filling editable form state from the fetched settings; the form must diverge once the user edits, so it can't be computed inline during render.
      setFormData({
        companyName: s.companyName,
        companyEmail: s.companyEmail,
        phoneNumber: s.phoneNumber,
        website: s.website,
        street: s.street,
        houseNumber: s.houseNumber,
        postalCode: s.postalCode,
        city: s.city,
        country: s.country,
        currency: s.currency,
        taxPercentage: s.taxPercentage,
        taxNumber: s.taxNumber,
        chamberOfCommerceNumber: s.chamberOfCommerceNumber,
        bankName: s.bankName,
        bankIBAN: s.bankIBAN,
        agbCode: s.agbCode,
        registerNumber: s.registerNumber,
        companyLogo: s.companyLogo,
      });
    }
  }, [settingsData]);

  useEffect(() => {
    if (vatData?.data) {
      const v = vatData.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-filling VAT preference toggles from fetched data; must diverge once user toggles.
      setVatFormData({
        emailNotifications: v.emailNotifications,
        inAppNotifications: v.inAppNotifications,
        pushNotifications: v.pushNotifications,
        advanceWarningDays: v.advanceWarningDays,
        secondReminderEnabled: v.secondReminderEnabled,
        secondReminderDays: v.secondReminderDays,
        monthlyNotifications: v.monthlyNotifications,
        quarterlyNotifications: v.quarterlyNotifications,
        yearlyNotifications: v.yearlyNotifications,
        preferredLanguage: v.preferredLanguage,
        timezone: v.timezone,
      });
    }
  }, [vatData]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Instellingen bewerken",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
    });
  }, [navigation, colors.background, colors.text, colors.primary]);

  const handleSave = async () => {
    setSaveError(null);

    // Run the two independent updates together and only navigate once both
    // have resolved. Navigating inside one mutation's onSuccess (as before)
    // could leave the screen on a still-pending or failed VAT update, and
    // surface that failure via setState on an unmounted component.
    const tasks: Promise<unknown>[] = [updateSettings.mutateAsync(formData)];
    if (vatData?.data) {
      tasks.push(updateVatPreferences.mutateAsync(vatFormData));
    }

    try {
      await Promise.all(tasks);
      router.back();
    } catch (error) {
      setSaveError((error as Error).message || "Fout bij bijwerken instellingen");
    }
  };

  return (
    <ScrollView
      testID="settings-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bedrijfsinformatie</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Bedrijfsnaam</Text>
        <TextInput
          testID="settings-company-name-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.companyName ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, companyName: text }))}
          placeholder="Bedrijfsnaam"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail</Text>
        <TextInput
          testID="settings-company-email-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.companyEmail ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, companyEmail: text }))}
          placeholder="E-mailadres"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Telefoonnummer</Text>
        <TextInput
          testID="settings-phone-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.phoneNumber ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, phoneNumber: text }))}
          placeholder="Telefoonnummer"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Website</Text>
        <TextInput
          testID="settings-website-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.website ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, website: text }))}
          placeholder="Website"
          placeholderTextColor={colors.textSecondary}
          keyboardType="url"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Adresgegevens</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Straat</Text>
        <TextInput
          testID="settings-street-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.street ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, street: text }))}
          placeholder="Straat"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Huisnummer</Text>
        <TextInput
          testID="settings-house-number-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.houseNumber ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, houseNumber: text }))}
          placeholder="Huisnummer"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Postcode</Text>
        <TextInput
          testID="settings-postal-code-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.postalCode ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, postalCode: text }))}
          placeholder="Postcode"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Plaats</Text>
        <TextInput
          testID="settings-city-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.city ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
          placeholder="Plaats"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Land</Text>
        <TextInput
          testID="settings-country-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.country ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, country: text }))}
          placeholder="Land"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Financiële Informatie</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Valuta</Text>
        <TextInput
          testID="settings-currency-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.currency ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, currency: text }))}
          placeholder="Valuta"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>BTW Percentage</Text>
        <TextInput
          testID="settings-tax-percentage-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.taxPercentage ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, taxPercentage: text }))}
          placeholder="BTW Percentage"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>BTW Nummer</Text>
        <TextInput
          testID="settings-tax-number-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.taxNumber ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, taxNumber: text }))}
          placeholder="BTW Nummer"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>KVK Nummer</Text>
        <TextInput
          testID="settings-chamber-of-commerce-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.chamberOfCommerceNumber ?? ""}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, chamberOfCommerceNumber: text }))
          }
          placeholder="KVK Nummer"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bankgegevens</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Banknaam</Text>
        <TextInput
          testID="settings-bank-name-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.bankName ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, bankName: text }))}
          placeholder="Banknaam"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>IBAN</Text>
        <TextInput
          testID="settings-bank-iban-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.bankIBAN ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, bankIBAN: text }))}
          placeholder="IBAN"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>BTW Notificatievoorkeuren</Text>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.text }}>E-mail notificaties</Text>
        <Switch
          testID="vat-email-notifications-switch"
          value={vatFormData.emailNotifications ?? false}
          onValueChange={(value) =>
            setVatFormData((prev) => ({ ...prev, emailNotifications: value }))
          }
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.text }}>Push notificaties</Text>
        <Switch
          testID="vat-push-notifications-switch"
          value={vatFormData.pushNotifications ?? false}
          onValueChange={(value) =>
            setVatFormData((prev) => ({ ...prev, pushNotifications: value }))
          }
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.text }}>Maandelijkse notificaties</Text>
        <Switch
          testID="vat-monthly-notifications-switch"
          value={vatFormData.monthlyNotifications ?? false}
          onValueChange={(value) =>
            setVatFormData((prev) => ({ ...prev, monthlyNotifications: value }))
          }
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.text }}>Kwartaalnotificaties</Text>
        <Switch
          testID="vat-quarterly-notifications-switch"
          value={vatFormData.quarterlyNotifications ?? false}
          onValueChange={(value) =>
            setVatFormData((prev) => ({ ...prev, quarterlyNotifications: value }))
          }
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.text }}>Jaarlijkse notificaties</Text>
        <Switch
          testID="vat-yearly-notifications-switch"
          value={vatFormData.yearlyNotifications ?? false}
          onValueChange={(value) =>
            setVatFormData((prev) => ({ ...prev, yearlyNotifications: value }))
          }
        />
      </View>

      {saveError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text>
      ) : null}

      <Pressable
        testID="settings-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={updateSettings.isPending || updateVatPreferences.isPending}
      >
        <Text style={styles.buttonText}>Opslaan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  error: {
    fontSize: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: "center",
    marginTop: Spacing.three,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
