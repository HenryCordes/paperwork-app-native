import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, useColorScheme } from "react-native";

import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";

interface FabProps {
  testID: string;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function Fab({ testID, onPress, accessibilityLabel, children }: FabProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={styles.fabPosition}
      onPress={onPress}
    >
      <Card style={[styles.fab, { backgroundColor: colors.primary }]}>
        {children ?? <Ionicons name="add" size={28} color="#ffffff" />}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fabPosition: {
    position: "absolute",
    right: Spacing.four,
    bottom: Spacing.four,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
