// The dashboard API returns period labels with English month names (e.g.
// "January 2025") regardless of the app's Dutch locale. A chart x-axis
// label has very little horizontal space per bar, so this abbreviates to a
// 3-letter Dutch month plus a 2-digit year ("jan 25") rather than
// translating to the full Dutch name, which is longer than the English
// original and made an already-tight label truncate even more aggressively.
// Anything that doesn't start with a recognized English month name (a
// quarter/year-only label, say) passes through unchanged.
const ENGLISH_MONTH_TO_DUTCH_ABBR: Record<string, string> = {
  January: "jan",
  February: "feb",
  March: "mrt",
  April: "apr",
  May: "mei",
  June: "jun",
  July: "jul",
  August: "aug",
  September: "sep",
  October: "okt",
  November: "nov",
  December: "dec",
};

export function toDutchChartLabel(label: string): string {
  const [month, year] = label.split(" ");
  const abbr = ENGLISH_MONTH_TO_DUTCH_ABBR[month];
  if (!abbr) {
    return label;
  }
  const shortYear = year?.length === 4 ? year.slice(2) : year;
  return shortYear ? `${abbr} ${shortYear}` : abbr;
}
