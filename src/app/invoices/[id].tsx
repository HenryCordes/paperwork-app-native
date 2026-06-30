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

import { useInvoiceById, useDeleteInvoice } from "@/hooks/useInvoices";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";
import { formatCurrency } from "@/utils/currency";
import { getInvoiceBadgeColor } from "@/utils/invoiceHelpers";

export default function InvoiceDetails() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const colorScheme = scheme === "dark" ? "dark" : "light";
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, error } = useInvoiceById(id);
  const invoice = data?.data;
  const deleteMutation = useDeleteInvoice();

  const handleDeletePress = () => {
    Alert.alert(
      "Factuur verwijderen",
      "Weet je zeker dat je deze factuur wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
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
      title: invoice ? `Factuur #${invoice.invoiceNumber}` : "Factuur details",
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      headerRight: () =>
        invoice ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Bewerken"
              onPress={() => router.push(`/invoices/edit/${id}`)}
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
  }, [navigation, invoice, colors.primary, colors.danger, colors.background, colors.text, id]);

  return (
    <ScrollView
      testID="invoice-details-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {isError ? (
        <Text style={[styles.message, { color: colors.danger }]}>
          Fout bij laden van factuur details: {error?.message || "Onbekende fout"}
        </Text>
      ) : isLoading ? null : invoice ? (
        <>
          {/* Invoice header */}
          <Card testID="invoice-detail-card" bordered style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>
              #{invoice.invoiceNumber} - {invoice.contactName || "Contact"}
            </Text>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Klant</Text>
              <Text style={{ color: colors.text }}>{invoice.contactName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary }}>Factuurdatum</Text>
              <Text style={{ color: colors.text }}>
                {new Date(invoice.invoiceDate).toLocaleDateString("nl-NL")}
              </Text>
            </View>
            {invoice.payDate ? (
              <View style={styles.row}>
                <Text style={{ color: colors.textSecondary }}>Betaaldatum</Text>
                <Text style={{ color: colors.text }}>
                  {new Date(invoice.payDate).toLocaleDateString("nl-NL")}
                </Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Totaal</Text>
              <Text style={[styles.totalLabel, { color: colors.text }]}>
                €{formatCurrency(invoice.priceIncludingTax || 0)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text
                testID="invoice-state-badge"
                style={[
                  styles.badge,
                  { backgroundColor: getInvoiceBadgeColor(invoice.state, colorScheme) },
                ]}
              >
                {invoice.state || "Onbekend"}
              </Text>
            </View>
          </Card>

          {/* Invoice line items */}
          {invoice.invoiceLines && invoice.invoiceLines.length > 0 ? (
            <Card bordered style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Factuurregels</Text>
              {invoice.invoiceLines.map((line, index) => (
                <View
                  key={line._id || index}
                  style={[
                    styles.lineItem,
                    index < invoice.invoiceLines.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                      : undefined,
                  ]}
                >
                  <View style={styles.row}>
                    <Text style={[styles.lineDescription, { color: colors.text }]}>
                      {line.description}
                    </Text>
                    {line.numberOfItems > 0 ? (
                      <Text style={{ color: colors.textSecondary }}>{line.numberOfItems}x</Text>
                    ) : null}
                  </View>
                  <View style={styles.row}>
                    <Text style={{ color: colors.textSecondary }}>Prijs (incl. BTW)</Text>
                    <Text style={{ color: colors.text }}>
                      €{formatCurrency(line.priceIncludingTax || 0)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={{ color: colors.textSecondary }}>Totaal regel</Text>
                    <Text style={{ color: colors.text }}>
                      €{formatCurrency(line.priceIncludingTax * line.numberOfItems || 0)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary }}>BTW {line.taxRate}%</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Totals summary */}
          {invoice.tax || invoice.taxLow || invoice.taxLowest ? (
            <Card bordered style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Samenvatting</Text>
              {invoice.tax ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>BTW 21%</Text>
                  <Text style={{ color: colors.text }}>€{formatCurrency(invoice.tax)}</Text>
                </View>
              ) : null}
              {invoice.taxLow ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>BTW 9%</Text>
                  <Text style={{ color: colors.text }}>€{formatCurrency(invoice.taxLow)}</Text>
                </View>
              ) : null}
              {invoice.taxLowest ? (
                <View style={styles.row}>
                  <Text style={{ color: colors.textSecondary }}>BTW 6%</Text>
                  <Text style={{ color: colors.text }}>
                    €{formatCurrency(invoice.taxLowest)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Totaal (incl. BTW)</Text>
                <Text style={[styles.totalLabel, { color: colors.text }]}>
                  €{formatCurrency(invoice.priceIncludingTax || 0)}
                </Text>
              </View>
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
  title: {
    fontWeight: "600",
    marginBottom: Spacing.one,
    fontSize: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.two,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  lineItem: {
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  lineDescription: {
    fontWeight: "500",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.three,
  },
});
