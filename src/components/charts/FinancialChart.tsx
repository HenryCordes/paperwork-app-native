import { useState } from "react";
import { BarChart } from "react-native-gifted-charts";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { pairBarData, type BarDataItem } from "./barPairing";
import { ChartLegend } from "./ChartLegend";
import { getNiceAxisScale } from "./chartScale";
import { formatCurrency, formatCurrencyWhole } from "@/utils/currency";
import { Colors, Spacing } from "@/constants/theme";
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
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  if (labels.length === 0) {
    return (
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        Geen gegevens beschikbaar voor deze periode
      </Text>
    );
  }

  const barData = pairBarData(labels, turnover, expenses, {
    turnoverColor: ChartColors.revenue[chartScheme],
    expensesColor: ChartColors.expenses[chartScheme],
  });
  const { maxValue, stepValue, noOfSections } = getNiceAxisScale(
    Math.max(...turnover, ...expenses, 0),
  );

  return (
    <View>
      <View
        testID="financial-chart-container"
        onLayout={handleLayout}
        style={styles.chartContainer}
      >
        <BarChart
          data={barData}
          {...(containerWidth !== null ? { parentWidth: containerWidth } : {})}
          rulesType="solid"
          rulesColor={
            scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
          }
          verticalLinesColor={
            scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
          }
          barWidth={16}
          maxValue={maxValue}
          stepValue={stepValue}
          noOfSections={noOfSections}
          // Default label box is barWidth+spacing (~18px) - too narrow even
          // for the widest label this chart shows ("25-02", the daily
          // format). Widened to fit that comfortably.
          labelWidth={48}
          yAxisLabelWidth={72}
          yAxisTextStyle={{ color: colors.textSecondary, textAlign: "left" }}
          xAxisLabelTextStyle={{
            color: colors.textSecondary,
            // The label box's left/width math centers it at labelWidth/2
            // from the bar's own left edge, not barWidth/2 - so widening the
            // box (above) shifts its visual center right of the bar by
            // (labelWidth-barWidth)/2 = (48-16)/2 = 16px. Shifting the text
            // back by that amount recenters it under the bar.
            transform: [{ translateX: -16 }],
          }}
          formatYLabel={(label: string) => `€${formatCurrencyWhole(Number(label))}`}
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
      </View>
      <View testID="financial-chart-legend-wrapper" style={styles.legendWrapper}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  emptyMessage: {
    textAlign: "center",
  },
  chartContainer: {
    width: "100%",
    overflow: "hidden",
  },
  legendWrapper: {
    marginTop: Spacing.three,
  },
  tooltip: {
    padding: 4,
    borderRadius: 4,
  },
});
