import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { Dropdown } from "@/components/Dropdown";
import { VatReturnDeadlineCard } from "@/components/VatReturnDeadlineCard";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";
import { useTaxPeriods, useTaxSummary, useExportTaxReturn } from "@/hooks/useTaxes";
import { TaxPeriodType } from "@/api/types/taxes";

const FORMAT_OPTIONS = [
  { value: "excel" as const, label: "Excel (.xlsx)" },
  { value: "csv" as const, label: "CSV (.csv)" },
];

export default function Taxes() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const currentYear = new Date().getFullYear();

  const [selectedPeriodType, setSelectedPeriodType] = useState<TaxPeriodType>("quarterly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "csv">("excel");
  const [includeDetails, setIncludeDetails] = useState(false);

  const { data: periodsData, isLoading: isLoadingPeriods } = useTaxPeriods();

  const { data: summaryData, isLoading: isLoadingSummary } = useTaxSummary({
    periodType: selectedPeriodType,
    period: selectedPeriod,
    year: selectedYear,
  });

  const exportMutation = useExportTaxReturn();

  // Auto-select the current period when the period type or year changes,
  // matching the source's useEffect behaviour.
  useEffect(() => {
    if (periodsData && selectedPeriodType) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);

      if (selectedPeriodType === "monthly") {
        setSelectedPeriod(currentMonth.toString());
      } else if (selectedPeriodType === "quarterly") {
        setSelectedPeriod(`Q${currentQuarter}`);
      } else if (selectedPeriodType === "yearly") {
        setSelectedPeriod(selectedYear.toString());
      }
    }
  }, [selectedPeriodType, periodsData, selectedYear]);

  const handleExport = async () => {
    if (!selectedPeriod || !selectedYear) {
      return;
    }

    try {
      await exportMutation.mutateAsync({
        periodType: selectedPeriodType,
        period: selectedPeriod,
        year: selectedYear,
        format: selectedFormat,
        includeDetails,
      });
    } catch {
      // Error surfaced via mutation's isError state; no additional handling needed.
    }
  };

  const periodTypeOptions = periodsData?.data.periodTypes.map((pt) => ({
    value: pt.value,
    label: pt.label,
  })) ?? [];

  const yearOptions = (periodsData?.data.years ?? []).map((y) => ({
    value: y.toString(),
    label: y.toString(),
  }));

  const periodOptions = (() => {
    if (!periodsData) return [];
    if (selectedPeriodType === "yearly") {
      return [{ value: selectedYear.toString(), label: `Jaar ${selectedYear}` }];
    }
    return (periodsData.data.periods[selectedPeriodType] ?? []).map((p) => ({
      value: p.value.toString(),
      label: p.label,
    }));
  })();

  if (isLoadingPeriods) {
    return (
      <View
        testID="taxes-loading"
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <VatReturnDeadlineCard periodType={selectedPeriodType} />

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          BTW Aangifte Export
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Exporteer uw BTW gegevens voor maandelijkse, kwartaal of jaarlijkse aangiftes.
          Alle bedragen worden automatisch berekend op basis van uw facturen en uitgaven.
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Instellingen</Text>

        {periodTypeOptions.length > 0 && (
          <Dropdown
            testID="taxes-period-type-dropdown"
            label="Periode Type"
            value={selectedPeriodType}
            options={periodTypeOptions}
            onSelect={(v) => {
              setSelectedPeriodType(v as TaxPeriodType);
            }}
          />
        )}

        {yearOptions.length > 0 && (
          <Dropdown
            testID="taxes-year-dropdown"
            label="Jaar"
            value={selectedYear.toString()}
            options={yearOptions}
            onSelect={(v) => setSelectedYear(Number(v))}
          />
        )}

        {periodOptions.length > 0 && (
          <Dropdown
            testID="taxes-period-dropdown"
            label="Periode"
            value={selectedPeriod}
            options={periodOptions}
            onSelect={(v) => setSelectedPeriod(v)}
          />
        )}

        <Dropdown
          testID="taxes-format-dropdown"
          label="Export Formaat"
          value={selectedFormat}
          options={FORMAT_OPTIONS}
          onSelect={(v) => setSelectedFormat(v as "excel" | "csv")}
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            Inclusief gedetailleerde lijsten
          </Text>
          <Switch
            value={includeDetails}
            onValueChange={setIncludeDetails}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={styles.exportButton}>
          {exportMutation.isPending ? (
            <ActivityIndicator testID="taxes-export-loading" />
          ) : (
            <Text
              testID="taxes-export-button"
              style={[styles.exportButtonText, { color: colors.primary }]}
              onPress={handleExport}
            >
              Exporteren
            </Text>
          )}
        </View>
      </Card>

      {isLoadingSummary ? (
        <View testID="taxes-summary-loading" style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : summaryData ? (
        <Card testID="taxes-summary" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>BTW Overzicht</Text>

          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Hoog tarief (21%)</Text>
            <Text style={{ color: colors.text }}>
              {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                summaryData.data.omzet.hoogTarief21.btw,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Laag tarief (9%)</Text>
            <Text style={{ color: colors.text }}>
              {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                summaryData.data.omzet.laagTarief9.btw,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Laagste tarief (6%)</Text>
            <Text style={{ color: colors.text }}>
              {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                summaryData.data.omzet.laagsteTarief6.btw,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Overige/verlegd (0%)</Text>
            <Text style={{ color: colors.text }}>
              {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                summaryData.data.omzet.overige.btw,
              )}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Totaal te betalen BTW</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                summaryData.data.teBetalen,
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Facturen</Text>
            <Text style={{ color: colors.text }}>{summaryData.data.invoiceCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textSecondary }}>Uitgaven</Text>
            <Text style={{ color: colors.text }}>{summaryData.data.expenseCount}</Text>
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: Spacing.one,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  toggleLabel: {
    fontSize: 14,
    flex: 1,
  },
  exportButton: {
    marginTop: Spacing.two,
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.one,
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
  },
  totalLabel: {
    fontWeight: "600",
  },
  totalValue: {
    fontWeight: "600",
  },
});
