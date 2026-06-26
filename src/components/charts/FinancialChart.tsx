import { BarChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { pairBarData, type BarDataItem } from "./barPairing";
import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { Colors } from "@/constants/theme";
import { ChartColors } from "@/constants/chartColors";

interface FinancialChartProps {
  labels: string[];
  turnover: number[];
  expenses: number[];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function FinancialChart({
  labels,
  turnover,
  expenses,
}: FinancialChartProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const chartScheme = scheme === "dark" ? "dark" : "light";

  if (labels.length === 0) {
    return (
      <Text style={styles.emptyMessage}>
        Geen gegevens beschikbaar voor deze periode
      </Text>
    );
  }

  const barData = pairBarData(labels, turnover, expenses, {
    turnoverColor: ChartColors.revenue[chartScheme],
    expensesColor: ChartColors.expenses[chartScheme],
  });

  return (
    <View>
      <BarChart
        data={barData}
        formatYLabel={(label: string) => formatCurrency(Number(label))}
        renderTooltip={(item: BarDataItem) => (
          <View
            style={[
              styles.tooltip,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <Text style={{ color: colors.text }}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        )}
      />
      <ChartLegend
        items={[
          {
            color: ChartColors.revenue[chartScheme],
            label: "Omzet",
            value: `€${formatCurrency(sum(turnover))}`,
          },
          {
            color: ChartColors.expenses[chartScheme],
            label: "Uitgaven",
            value: `€${formatCurrency(sum(expenses))}`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyMessage: {
    textAlign: "center",
  },
  tooltip: {
    padding: 4,
    borderRadius: 4,
  },
});
