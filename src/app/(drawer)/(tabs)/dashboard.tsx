import { useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useNavigation } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useDashboardStats } from "@/hooks/useDashboard";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { PieChart } from "@/components/charts/PieChart";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Card } from "@/components/Card";
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
  const navigation = useNavigation();

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

  // The funnel button lives in the real navigation header (hamburger |
  // title | funnel, matching the source), not in the screen's own content -
  // it has to be injected this way since the header itself is owned by the
  // (tabs) layout, not this screen, but the toggle needs this screen's state.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Periode wijzigen"
          onPress={() => setShowPeriodSelector((current) => !current)}
        >
          <Ionicons
            testID="period-filter-icon"
            name="funnel"
            size={22}
            color={colors.primary}
          />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary]);

  return (
    <View
      testID="dashboard-screen"
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        testID="dashboard-scroll"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {periodLabel(periodType, periodPreset)}
        </Text>

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
              <Card style={styles.summaryCard}>
                <Text
                  numberOfLines={1}
                  style={[styles.summaryLabel, { color: colors.primary }]}
                >
                  Omzet
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.summaryValue, { color: colors.textSecondary }]}
                >
                  €{formatCurrency(summary.totalRevenue)}
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text
                  numberOfLines={1}
                  style={[styles.summaryLabel, { color: colors.danger }]}
                >
                  Uitgaven
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.summaryValue, { color: colors.textSecondary }]}
                >
                  €{formatCurrency(summary.totalExpenses)}
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.summaryLabel,
                    { color: summary.netProfit >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {summary.netProfit >= 0 ? "Winst" : "Verlies"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.summaryValue, { color: colors.textSecondary }]}
                >
                  €{formatCurrency(summary.netProfit)}
                </Text>
              </Card>
            </View>

            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {periodLabel(periodType, periodPreset)}
              </Text>
              <FinancialChart
                labels={data?.data.labels ?? []}
                turnover={data?.data.turnover ?? []}
                expenses={data?.data.expenses ?? []}
              />
            </Card>

            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Omzet vs Uitgaven
              </Text>
              <PieChart
                revenue={summary.totalRevenue}
                expenses={summary.totalExpenses}
              />
            </Card>
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
    paddingTop: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
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
    paddingHorizontal: Spacing.one,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryLabel: {
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.two,
  },
});
