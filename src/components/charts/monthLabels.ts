// The dashboard API returns period labels with English month names (e.g.
// "January 2025") regardless of the app's Dutch locale. Translates the
// month name in place; anything that doesn't start with a recognized
// English month name (a quarter/year-only label, say) passes through
// unchanged.
const ENGLISH_TO_DUTCH_MONTH: Record<string, string> = {
  January: "Januari",
  February: "Februari",
  March: "Maart",
  April: "April",
  May: "Mei",
  June: "Juni",
  July: "Juli",
  August: "Augustus",
  September: "September",
  October: "Oktober",
  November: "November",
  December: "December",
};

export function toDutchMonthLabel(label: string): string {
  const [month, ...rest] = label.split(" ");
  const dutchMonth = ENGLISH_TO_DUTCH_MONTH[month];
  return dutchMonth ? [dutchMonth, ...rest].join(" ") : label;
}
