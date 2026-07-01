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

import { useEmailById, useDeleteEmail, useSendEmail } from "@/hooks/useEmails";
import { Card } from "@/components/Card";
import { EmailBodyViewer } from "@/components/EmailBodyViewer";
import { Colors, Spacing } from "@/constants/theme";
import type { EmailCreateUpdateRequest } from "@/api/types/emails";

export default function EmailDetails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, error } = useEmailById(id);
  const email = data?.data;
  const deleteMutation = useDeleteEmail();
  const sendEmail = useSendEmail();

  const handleDeletePress = () => {
    Alert.alert(
      "Email verwijderen",
      "Weet je zeker dat je deze email wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  const handleSend = () => {
    if (!email) {
      return;
    }
    const payload: EmailCreateUpdateRequest = {
      _id: email._id,
      send: email.send,
      emailDate: email.emailDate,
      subject: email.subject,
      body: email.body,
      invoiceId: email.invoiceId,
      contactId: email.contactId,
      contactName: email.contactName,
      contactEmail: email.contactEmail,
      emailNumber: email.emailNumber,
    };
    sendEmail.mutate(payload, {
      onError: (err: Error) =>
        Alert.alert("Fout", err.message || "Fout bij verzenden email"),
      onSuccess: () => Alert.alert("Verzonden", "Email succesvol verstuurd!"),
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: email ? `Email #${email.emailNumber}` : "Email details",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      headerRight: () =>
        email ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Bewerken"
              onPress={() => router.push(`/emails/edit/${id}`)}
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
  }, [navigation, email, colors.primary, colors.danger, colors.background, colors.text, id]);

  return (
    <ScrollView
      testID="email-details-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van email: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : email ? (
        <>
          <Card bordered style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>
              #{email.emailNumber} - {email.subject}
            </Text>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Ontvanger</Text>
              <Text style={{ color: colors.text }}>{email.contactName || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Email</Text>
              <Text style={{ color: colors.text }}>{email.contactEmail || "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Datum</Text>
              <Text style={{ color: colors.text }}>
                {new Date(email.emailDate).toLocaleDateString("nl-NL")}
              </Text>
            </View>
            {email.invoiceId ? (
              <Pressable onPress={() => router.push(`/invoices/${email.invoiceId}`)}>
                <Text style={{ color: colors.primary }}>Bekijk factuur</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card bordered style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Email inhoud</Text>
            <EmailBodyViewer html={email.body} />
          </Card>

          <Pressable
            testID="email-send-button"
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={sendEmail.isPending}
          >
            <Text style={styles.buttonText}>
              {sendEmail.isPending ? "Verzenden..." : "Verzenden"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.three },
  message: { textAlign: "center", marginTop: Spacing.four },
  card: { gap: Spacing.one },
  title: { fontWeight: "600", marginBottom: Spacing.one, fontSize: 16 },
  sectionTitle: { fontWeight: "600", marginBottom: Spacing.two, fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: Spacing.three },
  button: { borderRadius: 8, paddingVertical: Spacing.three, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "600" },
});
