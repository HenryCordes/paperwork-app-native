import { StyleSheet, Text, View } from "react-native";

import { Spacing } from "@/constants/theme";

export interface ChartLegendItem {
  color: string;
  label: string;
  value: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text>
            {item.label}: {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.three,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
