import { View } from "react-native";
import { PieChart as GiftedPieChart } from "react-native-gifted-charts";

import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { ChartColors } from "@/constants/chartColors";

interface PieChartProps {
  revenue: number;
  expenses: number;
}

export function PieChart({ revenue, expenses }: PieChartProps) {
  return (
    <View>
      <GiftedPieChart
        data={[
          { value: revenue, color: ChartColors.revenue.light, text: "Omzet" },
          { value: expenses, color: ChartColors.expenses.light, text: "Uitgaven" },
        ]}
        radius={90}
      />
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
  );
}
