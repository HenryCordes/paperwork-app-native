import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { PeriodType, PeriodPreset } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { Card } from "@/components/Card";
import { Colors, Spacing } from "@/constants/theme";

interface PeriodSelectorProps {
  periodType: PeriodType;
  periodPreset: PeriodPreset;
  onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

const TYPE_OPTIONS: Option<PeriodType>[] = [
  { value: PERIOD_TYPES.DAILY, label: "Dag" },
  { value: PERIOD_TYPES.MONTHLY, label: "Maand" },
  { value: PERIOD_TYPES.QUARTERLY, label: "Kwartaal" },
  { value: PERIOD_TYPES.YEARLY, label: "Jaar" },
];

const PRESET_OPTIONS: Option<PeriodPreset>[] = [
  { value: PERIOD_PRESETS.LAST_MONTH, label: "Afgelopen Maand" },
  { value: PERIOD_PRESETS.LAST_THREE_MONTHS, label: "Afgelopen 3 Maanden" },
  { value: PERIOD_PRESETS.LAST_TWELVE_MONTHS, label: "Afgelopen 12 Maanden" },
  { value: PERIOD_PRESETS.THIS_YEAR, label: "Dit Jaar" },
  { value: PERIOD_PRESETS.LAST_YEAR, label: "Vorig Jaar" },
  { value: PERIOD_PRESETS.CUSTOM, label: "Aangepaste Periode" },
];

function labelFor<T extends string>(options: Option<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

interface DropdownProps<T extends string> {
  testID: string;
  label: string;
  value: T;
  options: Option<T>[];
  onSelect: (value: T) => void;
}

function Dropdown<T extends string>({
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
        <Modal transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
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

export function PeriodSelector({
  periodType,
  periodPreset,
  onPeriodChange,
}: PeriodSelectorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Card style={styles.card}>
      <Dropdown
        testID="period-type-dropdown"
        label="Per"
        value={periodType}
        options={TYPE_OPTIONS}
        onSelect={(type) => onPeriodChange(type, periodPreset)}
      />
      <Dropdown
        testID="period-preset-dropdown"
        label="Periode"
        value={periodPreset}
        options={PRESET_OPTIONS}
        onSelect={(preset) => onPeriodChange(periodType, preset)}
      />

      {periodPreset === PERIOD_PRESETS.CUSTOM ? (
        <Text style={{ color: colors.textSecondary }}>
          Aangepaste periode-functionaliteit volgt in toekomstige update
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
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
