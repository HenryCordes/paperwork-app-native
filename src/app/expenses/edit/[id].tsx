import { useEffect, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useExpenseById, useCreateOrUpdateExpense } from "@/hooks/useExpenses";
import { useContactsList } from "@/hooks/useContacts";
import { useScan } from "@/hooks/scan/useScan";
import documentsService from "@/api/services/documentsService";
import { Dropdown } from "@/components/Dropdown";
import { ExpenseCreateUpdateRequest } from "@/api/types/expenses";
import { Colors, Spacing } from "@/constants/theme";

interface ScannedImage {
  uri: string;
  name: string;
  type: string;
}

function toDateOnlyISOString(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().split("T")[0];
}

const defaultExpense: ExpenseCreateUpdateRequest = {
  contactId: "",
  contactName: "",
  expenseNumber: 0,
  expenseDate: toDateOnlyISOString(new Date()),
  info: "",
  tax: 0,
  taxLow: 0,
  price: 0,
  priceWOTaxes: 0,
};

export default function ExpenseEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [formData, setFormData] = useState<ExpenseCreateUpdateRequest>(defaultExpense);
  const [scannedImage, setScannedImage] = useState<ScannedImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: expenseData } = useExpenseById(id);
  const { data: contactsData, isError: isContactsError } = useContactsList();
  const createOrUpdateExpense = useCreateOrUpdateExpense();
  const { scan, isScanning, scanError } = useScan();

  useEffect(() => {
    if (id === "create") {
      setFormData(defaultExpense);
      setScannedImage(null);
      return;
    }

    if (expenseData?.data) {
      const expense = expenseData.data;
      setFormData({
        _id: expense._id,
        contactId: expense.contactId,
        contactName: expense.contactName,
        expenseNumber: expense.expenseNumber,
        expenseDate: expense.expenseDate,
        info: expense.info,
        tax: expense.tax,
        taxLow: expense.taxLow,
        price: expense.price,
        priceWOTaxes: expense.priceWOTaxes,
        expenseFile: expense.expenseFile,
      });
    }
  }, [expenseData, id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: `Kosten ${id !== "create" ? "Bewerken" : "Toevoegen"}`,
    });
  }, [navigation, id]);

  const contactOptions = (contactsData?.data.docs ?? []).map((contact) => ({
    value: contact._id,
    label: contact.companyName,
  }));

  const handleSelectContact = (contactId: string) => {
    const contact = contactsData?.data.docs.find((c) => c._id === contactId);
    setFormData((prev) => ({ ...prev, contactId, contactName: contact?.companyName ?? "" }));
  };

  const handleScan = async () => {
    const result = await scan();
    if (!result) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      expenseDate: toDateOnlyISOString(result.receiptInfo.date),
      price: result.receiptInfo.total,
      tax: result.receiptInfo.taxHigh,
      taxLow: result.receiptInfo.taxLow,
    }));
    setScannedImage({
      uri: result.imageUri,
      name: `bon_${Date.now()}.jpg`,
      type: "image/jpeg",
    });
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      let expenseFile = formData.expenseFile;
      if (scannedImage) {
        expenseFile = await documentsService.uploadReceiptDocument(scannedImage);
      }

      createOrUpdateExpense.mutate(
        {
          ...formData,
          expenseFile,
          ...(id && id !== "create" ? { _id: id } : {}),
        },
        {
          onSuccess: () => router.back(),
          onError: (error: Error) => {
            setSaveError(error.message || "Fout bij opslaan van kosten");
            setIsSaving(false);
          },
        },
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Fout bij opslaan van kosten");
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      testID="expense-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Contact</Text>
        <Dropdown
          testID="contact-dropdown"
          label="Contact"
          value={formData.contactId}
          options={contactOptions}
          onSelect={handleSelectContact}
        />
        {isContactsError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            Fout bij het laden van contacten
          </Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Omschrijving</Text>
        <TextInput
          testID="expense-info-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.info}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, info: text }))}
          placeholder="Voer omschrijving in"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Datum</Text>
        <TextInput
          testID="expense-date-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.expenseDate}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, expenseDate: text }))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>BTW 21%</Text>
        <TextInput
          testID="expense-tax-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={String(formData.tax)}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, tax: parseFloat(text) || 0 }))
          }
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>BTW 9%</Text>
        <TextInput
          testID="expense-taxlow-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={String(formData.taxLow)}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, taxLow: parseFloat(text) || 0 }))
          }
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Bedrag (incl. BTW)</Text>
        <TextInput
          testID="expense-price-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={String(formData.price)}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, price: parseFloat(text) || 0 }))
          }
          keyboardType="decimal-pad"
        />
      </View>

      <Pressable
        testID="scan-button"
        style={[styles.button, { backgroundColor: colors.secondary }]}
        onPress={handleScan}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>{isScanning ? "Bon scannen..." : "Bon scannen"}</Text>
      </Pressable>

      {scanError ? <Text style={[styles.error, { color: colors.danger }]}>{scanError}</Text> : null}

      {saveError ? <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text> : null}

      <Pressable
        testID="expense-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>{id !== "create" ? "Opslaan" : "Toevoegen"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
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
  error: {
    fontSize: 12,
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
