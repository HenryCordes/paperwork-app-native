import { StyleSheet, View, type ViewProps, useColorScheme } from "react-native";

import { Colors, Spacing } from "@/constants/theme";

interface CardProps extends ViewProps {
  // Visible border + tighter padding, for list/detail item cards (Expenses
  // and every later Phase 4 batch). Plain cards (Dashboard, PeriodSelector)
  // stay borderless - leave this false there.
  bordered?: boolean;
}

export function Card({ style, children, bordered = false, ...rest }: CardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement },
        bordered ? [styles.bordered, { borderColor: colors.border }] : null,
        style,
      ]}
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
  bordered: {
    borderWidth: 10,
    padding: Spacing.two,
  },
});
