import { StyleSheet, View, type ViewProps, useColorScheme } from "react-native";

import { Colors, Spacing } from "@/constants/theme";

export function Card({ style, children, ...rest }: ViewProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundElement }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.three,
  },
});
