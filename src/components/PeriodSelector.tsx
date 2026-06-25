import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { PeriodType, PeriodPreset } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { Colors, Spacing } from "@/constants/theme";

interface PeriodSelectorProps {
  periodType: PeriodType;
  periodPreset: PeriodPreset;
  onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void;
}

const TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: PERIOD_TYPES.DAILY, label: "Dag" },
  { value: PERIOD_TYPES.MONTHLY, label: "Maand" },
  { value: PERIOD_TYPES.QUARTERLY, label: "Kwartaal" },
  { value: PERIOD_TYPES.YEARLY, label: "Jaar" },
];

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: PERIOD_PRESETS.LAST_MONTH, label: "Afgelopen Maand" },
  { value: PERIOD_PRESETS.LAST_THREE_MONTHS, label: "Afgelopen 3 Maanden" },
  { value: PERIOD_PRESETS.LAST_TWELVE_MONTHS, label: "Afgelopen 12 Maanden" },
  { value: PERIOD_PRESETS.THIS_YEAR, label: "Dit Jaar" },
  { value: PERIOD_PRESETS.LAST_YEAR, label: "Vorig Jaar" },
  { value: PERIOD_PRESETS.CUSTOM, label: "Aangepaste Periode" },
];

export function PeriodSelector({
  periodType,
  periodPreset,
  onPeriodChange,
}: PeriodSelectorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Per</Text>
      <View style={styles.optionsRow}>
        {TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onPeriodChange(option.value, periodPreset)}
            style={[
              styles.chip,
              option.value === periodType && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={{
                color: option.value === periodType ? "#ffffff" : colors.text,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Periode</Text>
      <View style={styles.optionsRow}>
        {PRESET_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onPeriodChange(periodType, option.value)}
            style={[
              styles.chip,
              option.value === periodPreset && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={{
                color: option.value === periodPreset ? "#ffffff" : colors.text,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {periodPreset === PERIOD_PRESETS.CUSTOM ? (
        <Text style={{ color: colors.textSecondary }}>
          Aangepaste periode-functionaliteit volgt in toekomstige update
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 16,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
