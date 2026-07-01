import { useEffect, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import {
  useEmailById,
  useCreateOrUpdateEmail,
  useSendEmail,
} from "@/hooks/useEmails";
import { useContactsList } from "@/hooks/useContacts";
import { useInvoicesList } from "@/hooks/useInvoices";
import { Dropdown } from "@/components/Dropdown";
import { EmailBodyEditor } from "@/components/EmailBodyEditor";
import type { EmailCreateUpdateRequest } from "@/api/types/emails";
import { Colors, Spacing } from "@/constants/theme";
import { isEmptyHtmlBody } from "@/utils/htmlContent";

function contactLabel(contact: {
  typeName: string;
  firstName: string;
  lastName: string;
  companyName: string;
}): string {
  return contact.typeName === "Particulier"
    ? `${contact.lastName}, ${contact.firstName}`
    : contact.companyName;
}

const defaultEmail: Omit<EmailCreateUpdateRequest, "emailNumber"> = {
  send: false,
  emailDate: new Date().toISOString().split("T")[0],
  subject: "",
  body: "",
  invoiceId: "",
  contactId: "",
  contactName: "",
  contactEmail: "",
};

export default function EmailEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "create";

  const [formData, setFormData] = useState<EmailCreateUpdateRequest>({
    ...defaultEmail,
    emailNumber: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: emailData } = useEmailById(id);
  const { data: contactsData, isError: isContactsError } = useContactsList();
  const { data: invoicesData } = useInvoicesList({ offset: 0, limit: 100 });
  const createOrUpdate = useCreateOrUpdateEmail();
  const sendEmail = useSendEmail();

  useEffect(() => {
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed create-mode defaults + a random email number (parity with source)
      setFormData({
        ...defaultEmail,
        emailNumber: Math.floor(1000 + Math.random() * 9000),
      });
      return;
    }
    if (emailData?.data) {
      const email = emailData.data;
      setFormData({
        _id: email._id,
        send: email.send,
        emailDate: email.emailDate,
        subject: email.subject,
        body: email.body,
        invoiceId: email.invoiceId ?? "",
        contactId: email.contactId,
        contactName: email.contactName,
        contactEmail: email.contactEmail,
        emailNumber: email.emailNumber,
      });
    }
  }, [emailData, isNew]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: isNew ? "Nieuwe Email" : "Email Bewerken",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
    });
  }, [navigation, isNew, colors.background, colors.text, colors.primary]);

  const contacts = contactsData?.data.docs ?? [];
  const invoices = invoicesData?.data.docs ?? [];

  const contactOptions = contacts.map((contact) => ({
    value: contact._id,
    label: contactLabel(contact),
  }));

  const invoiceOptions = [{ value: "", label: "Geen factuur" }].concat(
    invoices.map((invoice) => ({
      value: invoice._id,
      label: `#${invoice.invoiceNumber} - ${invoice.contactName}`,
    })),
  );

  const handleSelectContact = (contactId: string) => {
    const contact = contacts.find((c) => c._id === contactId);
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contactId,
        contactName: contactLabel(contact),
        contactEmail: contact.emailAddress ?? "",
      }));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.subject.trim()) next.subject = "Onderwerp is verplicht";
    if (!formData.contactId) next.contactId = "Contactpersoon is verplicht";
    if (!formData.emailDate) next.emailDate = "Datum is verplicht";
    if (isEmptyHtmlBody(formData.body)) next.body = "Email inhoud is verplicht";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }
    setSaveError(null);
    createOrUpdate.mutate(
      formData,
      {
        onSuccess: () => router.back(),
        onError: (err: Error) => setSaveError(err.message || "Fout bij opslaan van email"),
      },
    );
  };

  const handleSend = () => {
    if (!validate()) {
      return;
    }
    setSaveError(null);
    sendEmail.mutate(
      formData,
      {
        onSuccess: () => router.back(),
        onError: (err: Error) => setSaveError(err.message || "Fout bij verzenden van email"),
      },
    );
  };

  return (
    <ScrollView
      testID="email-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email nummer</Text>
        <TextInput
          testID="email-number-input"
          style={[styles.input, { color: colors.textSecondary, borderColor: colors.textSecondary }]}
          value={String(formData.emailNumber)}
          editable={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Onderwerp</Text>
        <TextInput
          testID="email-subject-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.subject}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, subject: text }))}
          placeholder="Onderwerp van de email"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.subject ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.subject}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Contactpersoon</Text>
        <Dropdown
          testID="contact-dropdown"
          label="Contactpersoon"
          value={formData.contactId}
          options={contactOptions}
          onSelect={handleSelectContact}
        />
        {isContactsError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            Fout bij het laden van contacten
          </Text>
        ) : null}
        {errors.contactId ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.contactId}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Datum</Text>
        <TextInput
          testID="email-date-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.emailDate}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, emailDate: text }))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.emailDate ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.emailDate}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Gekoppelde factuur (optioneel)
        </Text>
        <Dropdown
          testID="invoice-dropdown"
          label="Gekoppelde factuur"
          value={formData.invoiceId ?? ""}
          options={invoiceOptions}
          onSelect={(value) => setFormData((prev) => ({ ...prev, invoiceId: value }))}
        />
      </View>

      <View style={[styles.field, styles.toggleRow]}>
        <Text style={[styles.label, { color: colors.text }]}>Verzonden</Text>
        <Switch
          testID="email-send-toggle"
          value={formData.send}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, send: value }))}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bericht</Text>
        {isNew || formData._id ? (
          <EmailBodyEditor
            key={formData._id ?? "new"}
            initialContent={formData.body}
            onChange={(body) => setFormData((prev) => ({ ...prev, body }))}
          />
        ) : null}
        {errors.body ? (
          <Text style={[styles.error, { color: colors.danger }]}>{errors.body}</Text>
        ) : null}
      </View>

      {saveError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text>
      ) : null}

      <Pressable
        testID="email-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.buttonText}>{isNew ? "Toevoegen" : "Opslaan"}</Text>
      </Pressable>
      <Pressable
        testID="email-send-submit"
        style={[styles.button, { backgroundColor: colors.secondary }]}
        onPress={handleSend}
      >
        <Text style={styles.buttonText}>Verzenden</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.three },
  field: { gap: Spacing.one },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14 },
  sectionTitle: { fontWeight: "600", fontSize: 15 },
  input: { borderBottomWidth: 1, paddingVertical: Spacing.two, fontSize: 16 },
  error: { fontSize: 12 },
  button: { borderRadius: 8, paddingVertical: Spacing.three, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "600" },
});
