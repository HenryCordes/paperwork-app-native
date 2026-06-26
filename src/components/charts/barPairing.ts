import { formatChartLabel } from "./chartLabelFormat";

export interface BarDataItem {
  value: number;
  frontColor: string;
  spacing?: number;
  label?: string;
}

interface PairBarDataColors {
  turnoverColor?: string;
  expensesColor?: string;
}

const DEFAULT_TURNOVER_COLOR = "#0054e9";
const DEFAULT_EXPENSES_COLOR = "#c5000f";

export function pairBarData(
  labels: string[],
  turnover: number[],
  expenses: number[],
  colors: PairBarDataColors = {},
): BarDataItem[] {
  const turnoverColor = colors.turnoverColor ?? DEFAULT_TURNOVER_COLOR;
  const expensesColor = colors.expensesColor ?? DEFAULT_EXPENSES_COLOR;

  return labels.flatMap((label, index) => [
    {
      value: turnover[index],
      frontColor: turnoverColor,
      spacing: 2,
      label: formatChartLabel(label),
    },
    {
      value: expenses[index],
      frontColor: expensesColor,
    },
  ]);
}
