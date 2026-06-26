const ENGLISH_MONTH_TO_DUTCH_ABBR: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mrt",
  April: "Apr",
  May: "Mei",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Okt",
  November: "Nov",
  December: "Dec",
};

const QUARTER_PATTERN = /^(Q[1-4]) \d{4}$/;
const ISO_DATE_PATTERN = /^\d{4}-(\d{2})-(\d{2})/;
const MAX_CHART_LABEL_LENGTH = 4;

// No rotation on the x-axis (it has to scroll in sync with the bars, which
// only the chart library's own native label rendering does), so labels must
// fit a narrow, horizontal slot on their own. Each known period-type format
// gets its own compact form; anything unrecognized falls back to a short cap.
export function formatChartLabel(label: string): string {
  const [month] = label.split(" ");
  const monthAbbr = ENGLISH_MONTH_TO_DUTCH_ABBR[month];
  if (monthAbbr) {
    return monthAbbr;
  }

  const quarterMatch = label.match(QUARTER_PATTERN);
  if (quarterMatch) {
    return quarterMatch[1];
  }

  const isoMatch = label.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    const [, isoMonth, isoDay] = isoMatch;
    return `${isoDay}-${isoMonth}`;
  }

  return label.length > MAX_CHART_LABEL_LENGTH
    ? label.slice(0, MAX_CHART_LABEL_LENGTH)
    : label;
}
