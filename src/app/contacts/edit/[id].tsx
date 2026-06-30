import { useEffect, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useContactById, useCreateOrUpdateContact } from "@/hooks/useContacts";
import { Dropdown } from "@/components/Dropdown";
import { ContactCreateUpdateRequest } from "@/api/types/contacts";
import { Colors, Spacing } from "@/constants/theme";

const defaultContact: ContactCreateUpdateRequest = {
  companyName: "",
  typeOfContact: "Klant",
  typeName: "Particulier",
  lastName: "",
  firstName: "",
  initials: "",
  emailAddress: "",
  phoneNumber: "",
  mobilePhoneNumber: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "Nederland",
  visitingStreet: "",
  visitingHouseNumber: "",
  visitingPostalCode: "",
  visitingCity: "",
  visitingCountry: "Nederland",
  bankIBAN: "",
  bankPersonName: "",
};

const typeOfContactOptions = [
  { value: "Klant", label: "Klant" },
  { value: "Leverancier", label: "Leverancier" },
];

const typeNameOptions = [
  { value: "Particulier", label: "Particulier" },
  { value: "Bedrijf", label: "Bedrijf" },
];

export default function ContactEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [formData, setFormData] = useState<ContactCreateUpdateRequest>(defaultContact);
  const [sameAddress, setSameAddress] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: contactData } = useContactById(id);
  const createOrUpdateContact = useCreateOrUpdateContact();

  useEffect(() => {
    if (id === "create") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form for create mode
      setFormData(defaultContact);
      setSameAddress(false);
      return;
    }

    if (contactData?.data) {
      const contact = contactData.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-filling form from fetched contact
      setFormData({
        companyName: contact.companyName || "",
        typeOfContact: contact.typeOfContact || "Klant",
        typeName: contact.typeName || "Particulier",
        lastName: contact.lastName || "",
        firstName: contact.firstName || "",
        initials: contact.initials || "",
        gender: contact.gender,
        emailAddress: contact.emailAddress || "",
        phoneNumber: contact.phoneNumber || "",
        mobilePhoneNumber: contact.mobilePhoneNumber || "",
        street: contact.street || "",
        houseNumber: contact.houseNumber || "",
        postalCode: contact.postalCode || "",
        city: contact.city || "",
        country: contact.country || "Nederland",
        visitingStreet: contact.visitingStreet || "",
        visitingHouseNumber: contact.visitingHouseNumber || "",
        visitingPostalCode: contact.visitingPostalCode || "",
        visitingCity: contact.visitingCity || "",
        visitingCountry: contact.visitingCountry || "Nederland",
        bankIBAN: contact.bankIBAN || "",
        bankPersonName: contact.bankPersonName || "",
      });

      setSameAddress(
        contact.street === contact.visitingStreet &&
          contact.houseNumber === contact.visitingHouseNumber &&
          contact.postalCode === contact.visitingPostalCode &&
          contact.city === contact.visitingCity &&
          contact.country === contact.visitingCountry,
      );
    }
  }, [id, contactData]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: id !== "create" ? "Contact bewerken" : "Nieuw contact",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
    });
  }, [navigation, id, colors.background, colors.text, colors.primary]);

  const handleChange = (field: keyof ContactCreateUpdateRequest, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (
        sameAddress &&
        (field === "street" ||
          field === "houseNumber" ||
          field === "postalCode" ||
          field === "city" ||
          field === "country")
      ) {
        const visitingField = `visiting${
          field.charAt(0).toUpperCase() + field.slice(1)
        }` as keyof ContactCreateUpdateRequest;
        updated[visitingField] = value as never;
      }

      return updated;
    });
  };

  const handleSameAddressToggle = (checked: boolean) => {
    setSameAddress(checked);

    if (checked) {
      setFormData((prev) => ({
        ...prev,
        visitingStreet: prev.street,
        visitingHouseNumber: prev.houseNumber,
        visitingPostalCode: prev.postalCode,
        visitingCity: prev.city,
        visitingCountry: prev.country,
      }));
    }
  };

  const handleSave = () => {
    setValidationError(null);
    setSaveError(null);

    if (!formData.firstName || !formData.lastName || !formData.companyName || !formData.emailAddress) {
      setValidationError(
        "Vul de verplichte velden in (voornaam, achternaam, bedrijfsnaam en e-mail)",
      );
      return;
    }

    const payload: ContactCreateUpdateRequest = {
      ...formData,
      ...(id && id !== "create" ? { _id: id } : {}),
    };

    createOrUpdateContact.mutate(payload, {
      onSuccess: () => router.back(),
      onError: (error: Error) => {
        setSaveError(error.message || "Fout bij opslaan van contact");
      },
    });
  };

  return (
    <ScrollView
      testID="contact-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Bedrijfsgegevens */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bedrijfsgegevens</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Bedrijfsnaam <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput
            testID="contact-companyName-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.companyName}
            onChangeText={(text) => handleChange("companyName", text)}
            placeholder="Voer bedrijfsnaam in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Dropdown
            testID="contact-typeOfContact-dropdown"
            label="Klant/Leverancier"
            value={formData.typeOfContact}
            options={typeOfContactOptions}
            onSelect={(value) => handleChange("typeOfContact", value)}
          />
        </View>

        <View style={styles.field}>
          <Dropdown
            testID="contact-typeName-dropdown"
            label="Particulier/Bedrijf"
            value={formData.typeName}
            options={typeNameOptions}
            onSelect={(value) => handleChange("typeName", value)}
          />
        </View>
      </View>

      {/* Persoonsgegevens */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Persoonsgegevens</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Voornaam <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput
            testID="contact-firstName-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.firstName}
            onChangeText={(text) => handleChange("firstName", text)}
            placeholder="Voer voornaam in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Achternaam <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput
            testID="contact-lastName-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.lastName}
            onChangeText={(text) => handleChange("lastName", text)}
            placeholder="Voer achternaam in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Initialen</Text>
          <TextInput
            testID="contact-initials-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.initials}
            onChangeText={(text) => handleChange("initials", text)}
            placeholder="Bijv. J.D."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Contactgegevens */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Contactgegevens</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            E-mailadres <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput
            testID="contact-emailAddress-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.emailAddress}
            onChangeText={(text) => handleChange("emailAddress", text)}
            placeholder="Voer e-mailadres in"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Telefoonnummer</Text>
          <TextInput
            testID="contact-phoneNumber-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.phoneNumber ?? ""}
            onChangeText={(text) => handleChange("phoneNumber", text)}
            placeholder="Voer telefoonnummer in"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mobiel nummer</Text>
          <TextInput
            testID="contact-mobilePhoneNumber-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.mobilePhoneNumber ?? ""}
            onChangeText={(text) => handleChange("mobilePhoneNumber", text)}
            placeholder="Voer mobiel nummer in"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Postadres */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Postadres</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Straat</Text>
          <TextInput
            testID="contact-street-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.street ?? ""}
            onChangeText={(text) => handleChange("street", text)}
            placeholder="Voer straatnaam in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Huisnummer</Text>
          <TextInput
            testID="contact-houseNumber-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.houseNumber ?? ""}
            onChangeText={(text) => handleChange("houseNumber", text)}
            placeholder="Voer huisnummer in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Postcode</Text>
          <TextInput
            testID="contact-postalCode-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.postalCode ?? ""}
            onChangeText={(text) => handleChange("postalCode", text)}
            placeholder="Voer postcode in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Plaats</Text>
          <TextInput
            testID="contact-city-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.city ?? ""}
            onChangeText={(text) => handleChange("city", text)}
            placeholder="Voer plaats in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Land</Text>
          <TextInput
            testID="contact-country-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.country ?? ""}
            onChangeText={(text) => handleChange("country", text)}
            placeholder="Voer land in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            Bezoekadres hetzelfde als postadres
          </Text>
          <Switch
            testID="contact-sameAddress-switch"
            value={sameAddress}
            onValueChange={handleSameAddressToggle}
          />
        </View>
      </View>

      {/* Bezoekadres (only shown when sameAddress is false) */}
      {!sameAddress ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bezoekadres</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Straat</Text>
            <TextInput
              testID="contact-visitingStreet-input"
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
              value={formData.visitingStreet ?? ""}
              onChangeText={(text) => handleChange("visitingStreet", text)}
              placeholder="Voer straatnaam in"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Huisnummer</Text>
            <TextInput
              testID="contact-visitingHouseNumber-input"
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
              value={formData.visitingHouseNumber ?? ""}
              onChangeText={(text) => handleChange("visitingHouseNumber", text)}
              placeholder="Voer huisnummer in"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Postcode</Text>
            <TextInput
              testID="contact-visitingPostalCode-input"
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
              value={formData.visitingPostalCode ?? ""}
              onChangeText={(text) => handleChange("visitingPostalCode", text)}
              placeholder="Voer postcode in"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Plaats</Text>
            <TextInput
              testID="contact-visitingCity-input"
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
              value={formData.visitingCity ?? ""}
              onChangeText={(text) => handleChange("visitingCity", text)}
              placeholder="Voer plaats in"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Land</Text>
            <TextInput
              testID="contact-visitingCountry-input"
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
              value={formData.visitingCountry ?? ""}
              onChangeText={(text) => handleChange("visitingCountry", text)}
              placeholder="Voer land in"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      ) : null}

      {/* Bankgegevens */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bankgegevens</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>IBAN</Text>
          <TextInput
            testID="contact-bankIBAN-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.bankIBAN ?? ""}
            onChangeText={(text) => handleChange("bankIBAN", text)}
            placeholder="Voer IBAN in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ten name van</Text>
          <TextInput
            testID="contact-bankPersonName-input"
            style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
            value={formData.bankPersonName ?? ""}
            onChangeText={(text) => handleChange("bankPersonName", text)}
            placeholder="Voer naam rekeninghouder in"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {validationError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{validationError}</Text>
      ) : null}

      {saveError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text>
      ) : null}

      <Pressable
        testID="contact-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={createOrUpdateContact.isPending}
      >
        <Text style={styles.buttonText}>
          {id !== "create" ? "Opslaan" : "Toevoegen"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  error: {
    fontSize: 12,
    textAlign: "center",
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
