import { useEffect, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useInvoiceById, useCreateOrUpdateInvoice } from "@/hooks/useInvoices";
import { useContactsList } from "@/hooks/useContacts";
import { Dropdown } from "@/components/Dropdown";
import { InvoiceCreateUpdateRequest, InvoiceLine } from "@/api/types/invoices";
import { Colors, Spacing } from "@/constants/theme";

function newBlankLine(): InvoiceLine {
  return {
    _id: `temp-${Date.now()}-${Math.random()}`,
    description: "",
    numberOfItems: 1,
    priceIncludingTax: 0,
    taxRate: 21,
    totalLinePrice: 0,
  };
}

function toDateOnly(iso: string): string {
  return iso.split("T")[0];
}

const defaultInvoice: Omit<InvoiceCreateUpdateRequest, "_id"> = {
  contactId: "",
  contactName: "",
  invoiceNumber: 0,
  invoiceDate: toDateOnly(new Date().toISOString()),
  priceIncludingTax: 0,
  invoiceLines: [newBlankLine()],
  state: "open",
};

export default function InvoiceEdit() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === "create";

  const [formData, setFormData] = useState<Partial<InvoiceCreateUpdateRequest>>(defaultInvoice);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: invoiceData } = useInvoiceById(id);
  const { data: contactsData, isError: isContactsError } = useContactsList();
  const createOrUpdateInvoice = useCreateOrUpdateInvoice();

  useEffect(() => {
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form to defaults when in create mode
      setFormData({ ...defaultInvoice, invoiceLines: [newBlankLine()] });
      return;
    }

    if (invoiceData?.data) {
      const invoice = invoiceData.data;
      setFormData({
        _id: invoice._id,
        contactId: invoice.contactId,
        contactName: invoice.contactName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        payDate: invoice.payDate,
        priceIncludingTax: invoice.priceIncludingTax,
        invoiceLines:
          invoice.invoiceLines.length > 0 ? invoice.invoiceLines : [newBlankLine()],
        state: invoice.state,
        tax: invoice.tax,
        taxLow: invoice.taxLow,
        taxLowest: invoice.taxLowest,
      });
    }
  }, [invoiceData, isNew]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: `Factuur ${!isNew ? "Bewerken" : "Toevoegen"}`,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
    });
  }, [navigation, isNew, colors.background, colors.text, colors.primary]);

  const contactOptions = (contactsData?.data.docs ?? []).map((contact) => ({
    value: contact._id,
    label: `${contact.firstName} ${contact.lastName}`,
  }));

  const handleSelectContact = (contactId: string) => {
    const contact = contactsData?.data.docs.find((c) => c._id === contactId);
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contactId,
        contactName: `${contact.firstName} ${contact.lastName}`,
      }));
    }
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      invoiceLines: [...(prev.invoiceLines ?? []), newBlankLine()],
    }));
  };

  const removeLine = (index: number) => {
    if ((formData.invoiceLines ?? []).length <= 1) {
      return;
    }
    setFormData((prev) => {
      const lines = [...(prev.invoiceLines ?? [])];
      lines.splice(index, 1);
      return { ...prev, invoiceLines: lines };
    });
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: InvoiceLine[keyof InvoiceLine]) => {
    setFormData((prev) => {
      const lines = [...(prev.invoiceLines ?? [])];
      lines[index] = { ...lines[index], [field]: value };
      if (field === "numberOfItems" || field === "priceIncludingTax") {
        const line = lines[index];
        line.totalLinePrice = Number(line.numberOfItems) * Number(line.priceIncludingTax);
      }
      return { ...prev, invoiceLines: lines };
    });
  };

  const handleSave = () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Strip temp IDs from new lines before submission
    const invoiceLines = (formData.invoiceLines ?? []).map((line) => {
      if (line._id && line._id.startsWith("temp-")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping temp _id before API submission
        const { _id, ...rest } = line;
        return rest as InvoiceLine;
      }
      return line;
    });

    const payload: InvoiceCreateUpdateRequest = {
      ...(formData as InvoiceCreateUpdateRequest),
      invoiceLines,
      ...(isNew ? {} : { _id: id }),
    };

    createOrUpdateInvoice.mutate(payload, {
      onSuccess: () => router.back(),
      onError: (error: Error) => {
        setSaveError(error.message || "Fout bij opslaan van factuur");
        setIsSaving(false);
      },
    });
  };

  return (
    <ScrollView
      testID="invoice-edit-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Contact picker */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Klant</Text>
        <Dropdown
          testID="contact-dropdown"
          label="Klant"
          value={formData.contactId ?? ""}
          options={contactOptions}
          onSelect={handleSelectContact}
        />
        {isContactsError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            Fout bij het laden van contacten
          </Text>
        ) : null}
      </View>

      {/* Invoice date */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Factuurdatum</Text>
        <TextInput
          testID="invoice-date-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.invoiceDate ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, invoiceDate: text }))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Pay date */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Betaaldatum</Text>
        <TextInput
          testID="invoice-paydate-input"
          style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
          value={formData.payDate ?? ""}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, payDate: text }))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Status */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
        <Dropdown
          testID="state-dropdown"
          label="Status"
          value={formData.state ?? "open"}
          options={[
            { value: "open", label: "Open" },
            { value: "betaald", label: "Betaald" },
            { value: "te laat", label: "Te laat" },
          ]}
          onSelect={(value) => setFormData((prev) => ({ ...prev, state: value }))}
        />
      </View>

      {/* Invoice lines */}
      <View style={styles.field}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Factuurregels</Text>

        {(formData.invoiceLines ?? []).map((line, index) => (
          <View
            key={line._id || index}
            style={[styles.lineContainer, { borderColor: colors.border }]}
          >
            <View style={styles.lineHeader}>
              <Text style={[styles.lineTitle, { color: colors.text }]}>
                Regel {index + 1}
              </Text>
              <Pressable
                testID={`remove-line-${index}`}
                onPress={() => removeLine(index)}
                disabled={(formData.invoiceLines ?? []).length <= 1}
              >
                <Text
                  style={[
                    styles.removeButton,
                    {
                      color:
                        (formData.invoiceLines ?? []).length <= 1
                          ? colors.textSecondary
                          : colors.danger,
                    },
                  ]}
                >
                  Verwijderen
                </Text>
              </Pressable>
            </View>

            <View style={styles.lineField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Omschrijving</Text>
              <TextInput
                testID={`line-description-${index}`}
                style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                value={line.description}
                onChangeText={(text) => updateLine(index, "description", text)}
                placeholder="Omschrijving"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.lineRow}>
              <View style={[styles.lineField, styles.half]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Aantal</Text>
                <TextInput
                  testID={`line-quantity-${index}`}
                  style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                  value={String(line.numberOfItems)}
                  onChangeText={(text) =>
                    updateLine(index, "numberOfItems", parseInt(text, 10) || 0)
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.lineField, styles.half]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Prijs (incl. BTW)
                </Text>
                <TextInput
                  testID={`line-price-${index}`}
                  style={[styles.input, { color: colors.text, borderColor: colors.textSecondary }]}
                  value={String(line.priceIncludingTax)}
                  onChangeText={(text) =>
                    updateLine(index, "priceIncludingTax", parseFloat(text) || 0)
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.lineField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>BTW %</Text>
              <Dropdown
                testID={`line-tax-${index}`}
                label="BTW"
                value={String(line.taxRate)}
                options={[
                  { value: "0", label: "0%" },
                  { value: "6", label: "6%" },
                  { value: "9", label: "9%" },
                  { value: "21", label: "21%" },
                ]}
                onSelect={(value) => updateLine(index, "taxRate", parseInt(value, 10))}
              />
            </View>
          </View>
        ))}

        <Pressable
          testID="add-line-button"
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={addLine}
        >
          <Text style={styles.buttonText}>+ Factuurregel toevoegen</Text>
        </Pressable>
      </View>

      {saveError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{saveError}</Text>
      ) : null}

      <Pressable
        testID="invoice-save-button"
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>{!isNew ? "Opslaan" : "Toevoegen"}</Text>
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
  lineField: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 15,
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
  lineContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineTitle: {
    fontWeight: "500",
  },
  removeButton: {
    fontSize: 13,
  },
  lineRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  half: {
    flex: 1,
  },
});
