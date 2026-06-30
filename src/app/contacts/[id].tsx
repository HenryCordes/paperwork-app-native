import { useLayoutEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useContactById, useDeleteContact } from "@/hooks/useContacts";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";

export default function ContactDetails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, error } = useContactById(id);
  const contact = data?.data;
  const deleteMutation = useDeleteContact();

  const handleDeletePress = () => {
    Alert.alert(
      "Contact verwijderen",
      `Weet je zeker dat je ${contact?.firstName} ${contact?.lastName} wilt verwijderen?`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(id, { onSuccess: () => router.back() });
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Contact details",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      headerRight: () =>
        contact ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Bewerken"
              onPress={() => router.push(`/contacts/edit/${id}`)}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityLabel="Verwijderen" onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDeletePress is recreated each render but its identity isn't a meaningful dependency here
  }, [navigation, contact, colors.primary, colors.danger, colors.background, colors.text, id]);

  return (
    <ScrollView
      testID="contact-details-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van contact details: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : contact ? (
        <>
          <Card testID="contact-basic-card" bordered style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Bedrijfsgegevens
            </Text>
            <Text style={[styles.companyName, { color: colors.text }]}>{contact.companyName}</Text>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Klant/Leverancier</Text>
              <Text style={{ color: colors.text }}>{contact.typeOfContact}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Particulier/Bedrijf</Text>
              <Text style={{ color: colors.text }}>{contact.typeName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Contactpersoon</Text>
              <Text style={{ color: colors.text }}>
                {contact.firstName} {contact.lastName}
              </Text>
            </View>
          </Card>

          {(contact.emailAddress || contact.phoneNumber || contact.mobilePhoneNumber) ? (
            <Card testID="contact-info-card" bordered style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Contactgegevens
              </Text>
              {contact.emailAddress ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>Email</Text>
                  <Text style={{ color: colors.text }}>{contact.emailAddress}</Text>
                </View>
              ) : null}
              {contact.phoneNumber ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>Telefoon</Text>
                  <Text style={{ color: colors.text }}>{contact.phoneNumber}</Text>
                </View>
              ) : null}
              {contact.mobilePhoneNumber ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>Mobiel</Text>
                  <Text style={{ color: colors.text }}>{contact.mobilePhoneNumber}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {(contact.street || contact.city || contact.postalCode) ? (
            <Card testID="contact-address-card" bordered style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Adresgegevens
              </Text>
              <Text style={[styles.addressLabel, { color: colors.text }]}>Postadres</Text>
              {contact.street && contact.houseNumber ? (
                <Text style={{ color: colors.text }}>
                  {contact.street} {contact.houseNumber}
                </Text>
              ) : null}
              {contact.postalCode && contact.city ? (
                <Text style={{ color: colors.text }}>
                  {contact.postalCode} {contact.city}
                </Text>
              ) : null}
              {contact.country ? (
                <Text style={{ color: colors.text }}>{contact.country}</Text>
              ) : null}

              {(contact.visitingStreet || contact.visitingCity) ? (
                <>
                  <Text style={[styles.addressLabel, { color: colors.text, marginTop: Spacing.two }]}>
                    Bezoekadres
                  </Text>
                  {contact.visitingStreet && contact.visitingHouseNumber ? (
                    <Text style={{ color: colors.text }}>
                      {contact.visitingStreet} {contact.visitingHouseNumber}
                    </Text>
                  ) : null}
                  {contact.visitingPostalCode && contact.visitingCity ? (
                    <Text style={{ color: colors.text }}>
                      {contact.visitingPostalCode} {contact.visitingCity}
                    </Text>
                  ) : null}
                  {contact.visitingCountry ? (
                    <Text style={{ color: colors.text }}>{contact.visitingCountry}</Text>
                  ) : null}
                </>
              ) : null}
            </Card>
          ) : null}

          {(contact.bankIBAN || contact.bankPersonName) ? (
            <Card testID="contact-bank-card" bordered style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Bankgegevens
              </Text>
              {contact.bankIBAN ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>IBAN</Text>
                  <Text style={{ color: colors.text }}>{contact.bankIBAN}</Text>
                </View>
              ) : null}
              {contact.bankPersonName ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>Ten name van</Text>
                  <Text style={{ color: colors.text }}>{contact.bankPersonName}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  message: {
    textAlign: "center",
    marginTop: Spacing.four,
  },
  card: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: Spacing.one,
  },
  companyName: {
    fontWeight: "600",
    fontSize: 18,
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addressLabel: {
    fontWeight: "600",
    marginBottom: Spacing.half,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.three,
  },
});
