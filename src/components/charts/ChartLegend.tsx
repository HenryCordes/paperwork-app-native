import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { Colors, Spacing } from "@/constants/theme";

export interface ChartLegendItem {
  color: string;
  label: string;
  value: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View
            testID={`legend-swatch-${item.label}`}
            style={[styles.swatch, { backgroundColor: item.color }]}
          />
          <Text style={{ color: colors.text }}>
            {item.label}: {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
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
