import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Colors, Spacing } from "@/constants/theme";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function labelFor<T extends string>(options: Option<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

interface DropdownProps<T extends string> {
  testID: string;
  label: string;
  value: T;
  options: Option<T>[];
  onSelect: (value: T) => void;
}

export function Dropdown<T extends string>({
  testID,
  label,
  value,
  options,
  onSelect,
}: DropdownProps<T>) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        testID={testID}
        style={[styles.field, { backgroundColor: colors.background }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={{ color: colors.text }}>{labelFor(options, value)}</Text>
        <Ionicons
          testID="dropdown-chevron"
          name="chevron-expand"
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>

      {isOpen ? (
        <Modal
          testID={`${testID}-modal`}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            testID={`${testID}-overlay`}
            style={styles.overlay}
            onPress={() => setIsOpen(false)}
          >
            <Pressable
              style={[styles.optionsCard, { backgroundColor: colors.backgroundElement }]}
            >
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{option.label}</Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  optionsCard: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
  },
  option: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
