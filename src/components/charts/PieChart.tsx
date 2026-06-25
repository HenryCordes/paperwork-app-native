import { View, useColorScheme } from "react-native";
import { PieChart as GiftedPieChart } from "react-native-gifted-charts";

import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { Colors } from "@/constants/theme";

interface PieChartProps {
  revenue: number;
  expenses: number;
}

export function PieChart({ revenue, expenses }: PieChartProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View>
      <GiftedPieChart
        data={[
          { value: revenue, color: colors.primary, text: "Omzet" },
          { value: expenses, color: colors.danger, text: "Uitgaven" },
        ]}
        radius={90}
      />
      <ChartLegend
        items={[
          { color: colors.primary, label: "Omzet", value: `€${formatCurrency(revenue)}` },
          { color: colors.danger, label: "Uitgaven", value: `€${formatCurrency(expenses)}` },
        ]}
      />
    </View>
  );
}
