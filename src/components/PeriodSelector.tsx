import { StyleSheet, Text, useColorScheme } from "react-native";

import { PeriodType, PeriodPreset } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { Card } from "@/components/Card";
import { Dropdown, Option } from "@/components/Dropdown";
import { Colors, Spacing } from "@/constants/theme";

interface PeriodSelectorProps {
  periodType: PeriodType;
  periodPreset: PeriodPreset;
  onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void;
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
});
