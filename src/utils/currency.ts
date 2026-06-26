export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// For repeated axis-tick labels (e.g. a chart's Y-axis), where exact cents
// add visual noise without adding information - formatCurrency (2 decimals)
// remains the standard for amounts shown once (summary cards, legends,
// tooltips).
export function formatCurrencyWhole(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 0,
  }).format(value);
}
