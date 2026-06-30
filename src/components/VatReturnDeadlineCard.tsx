import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { useTaxDeadline } from "@/hooks/useTaxes";
import { TaxPeriodType } from "@/api/types/taxes";

interface VatReturnDeadlineCardProps {
  periodType?: TaxPeriodType;
}

export function VatReturnDeadlineCard({
  periodType = "quarterly",
}: VatReturnDeadlineCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { data: deadlineData, isLoading } = useTaxDeadline(periodType);

  if (isLoading || !deadlineData) {
    return null;
  }

  const { deadline, label, daysUntilDeadline } = deadlineData.data;

  // Only show the card when the deadline is approaching (within 14 days).
  // Mirrors the source's same threshold.
  if (daysUntilDeadline > 14) {
    return null;
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const urgencyColor =
    daysUntilDeadline <= 3
      ? colors.danger
      : daysUntilDeadline <= 7
        ? colors.warning
        : colors.primary;

  return (
    <View
      testID="vat-deadline-card"
      style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: urgencyColor }]}
    >
      <Text style={[styles.icon]}>⏰</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: urgencyColor }]}>Volgende BTW Deadline</Text>
        <Text style={[styles.detail, { color: colors.text }]}>
          {formatDate(deadline)} — {label}
        </Text>
        <Text style={[styles.days, { color: urgencyColor }]}>
          {daysUntilDeadline} {daysUntilDeadline === 1 ? "dag" : "dagen"} resterend
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
  },
  detail: {
    fontSize: 13,
  },
  days: {
    fontSize: 12,
    fontWeight: "500",
  },
});
