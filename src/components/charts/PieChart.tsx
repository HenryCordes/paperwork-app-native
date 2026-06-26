import { StyleSheet, View } from "react-native";
import { PieChart as GiftedPieChart } from "react-native-gifted-charts";

import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { ChartColors } from "@/constants/chartColors";
import { Spacing } from "@/constants/theme";

interface PieChartProps {
  revenue: number;
  expenses: number;
}

export function PieChart({ revenue, expenses }: PieChartProps) {
  return (
    <View testID="pie-chart-container" style={styles.container}>
      <GiftedPieChart
        data={[
          { value: revenue, color: ChartColors.revenue.light, text: "Omzet" },
          { value: expenses, color: ChartColors.expenses.light, text: "Uitgaven" },
        ]}
        radius={90}
      />
      <View testID="pie-legend-wrapper" style={styles.legendWrapper}>
        <ChartLegend
          items={[
            {
              color: ChartColors.revenue.light,
              label: "Omzet",
              value: `€${formatCurrency(revenue)}`,
            },
            {
              color: ChartColors.expenses.light,
              label: "Uitgaven",
              value: `€${formatCurrency(expenses)}`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  legendWrapper: {
    marginTop: Spacing.three,
  },
});
