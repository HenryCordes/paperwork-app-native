import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDashboardStats } from "@/hooks/useDashboard";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { PieChart } from "@/components/charts/PieChart";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodType, PeriodPreset, RawDataPoint } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { formatCurrency } from "@/utils/currency";
import { Colors, Spacing } from "@/constants/theme";

function summarize(rawData: RawDataPoint[] | undefined) {
  if (!rawData) {
    return { totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
  }
  return rawData.reduce(
    (acc, point) => ({
      totalRevenue: acc.totalRevenue + point.totalRevenue,
      totalExpenses: acc.totalExpenses + point.totalExpenses,
      netProfit: acc.netProfit + point.netProfit,
    }),
    { totalRevenue: 0, totalExpenses: 0, netProfit: 0 },
  );
}

function periodLabel(periodType: PeriodType, periodPreset: PeriodPreset): string {
  if (periodPreset === PERIOD_PRESETS.LAST_MONTH) return "Overzicht Afgelopen Maand";
  if (periodPreset === PERIOD_PRESETS.LAST_THREE_MONTHS)
    return "Overzicht Afgelopen 3 Maanden";
  if (periodPreset === PERIOD_PRESETS.LAST_TWELVE_MONTHS)
    return "Overzicht Afgelopen 12 Maanden";
  if (periodPreset === PERIOD_PRESETS.THIS_YEAR) return "Overzicht Dit Jaar";
  if (periodPreset === PERIOD_PRESETS.LAST_YEAR) return "Overzicht Vorig Jaar";
  if (periodPreset === PERIOD_PRESETS.CUSTOM) return "Aangepaste Periode";

  switch (periodType) {
    case PERIOD_TYPES.DAILY:
      return "Dagelijks Overzicht";
    case PERIOD_TYPES.MONTHLY:
      return "Maandelijks Overzicht";
    case PERIOD_TYPES.QUARTERLY:
      return "Kwartaal Overzicht";
    case PERIOD_TYPES.YEARLY:
      return "Jaarlijks Overzicht";
    default:
      return "Financieel Overzicht";
  }
}

export default function Dashboard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>(PERIOD_TYPES.MONTHLY);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    PERIOD_PRESETS.THIS_YEAR,
  );

  const { data, isLoading, isError, error } = useDashboardStats({
    periodType,
    periodPreset,
  });

  const handlePeriodChange = (type: PeriodType, preset: PeriodPreset) => {
    setPeriodType(type);
    setPeriodPreset(preset);
  };

  const summary = summarize(data?.data.rawData);

  return (
    <View
      testID="dashboard-screen"
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + Spacing.three },
      ]}
    >
      <ScrollView
        testID="dashboard-scroll"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {periodLabel(periodType, periodPreset)}
          </Text>
          <Pressable
            accessibilityLabel="Periode wijzigen"
            onPress={() => setShowPeriodSelector((current) => !current)}
          >
            <Text style={{ color: colors.primary }}>Periode</Text>
          </Pressable>
        </View>

        {showPeriodSelector ? (
          <PeriodSelector
            periodType={periodType}
            periodPreset={periodPreset}
            onPeriodChange={handlePeriodChange}
          />
        ) : null}

        {isLoading ? (
          <Text style={{ color: colors.textSecondary }}>Laden...</Text>
        ) : isError ? (
          <Text style={{ color: colors.danger }}>
            {error instanceof Error
              ? error.message
              : "Kan dashboardgegevens niet laden. Probeer het opnieuw."}
          </Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={{ color: colors.primary }}>Omzet</Text>
                <Text style={{ color: colors.text }}>
                  €{formatCurrency(summary.totalRevenue)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={{ color: colors.danger }}>Uitgaven</Text>
                <Text style={{ color: colors.text }}>
                  €{formatCurrency(summary.totalExpenses)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text
                  style={{
                    color: summary.netProfit >= 0 ? colors.success : colors.danger,
                  }}
                >
                  {summary.netProfit >= 0 ? "Winst" : "Verlies"}
                </Text>
                <Text style={{ color: colors.text }}>
                  €{formatCurrency(summary.netProfit)}
                </Text>
              </View>
            </View>

            <FinancialChart
              labels={data?.data.labels ?? []}
              turnover={data?.data.turnover ?? []}
              expenses={data?.data.expenses ?? []}
            />

            <PieChart revenue={summary.totalRevenue} expenses={summary.totalExpenses} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
});
