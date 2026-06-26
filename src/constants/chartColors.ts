// paperwork-app's chart components (FinancialChart.tsx, PieChart.tsx) use
// their own distinct palette, separate from the app's general
// primary/danger theme colors used for text and controls - ported as
// hex equivalents of the source's exact RGBA values, not approximated
// from Colors.primary/Colors.danger.
export const ChartColors = {
  revenue: { light: "#36A2EB", dark: "#48CAFF" },
  expenses: { light: "#FF6384", dark: "#FF8198" },
} as const;
