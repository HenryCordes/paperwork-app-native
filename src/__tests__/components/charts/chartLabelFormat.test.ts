import { formatChartLabel } from "@/components/charts/chartLabelFormat";

describe("formatChartLabel", () => {
  // Per Maand: the API sends an English "Month Year" label - confirmed
  // against the source app's own screenshot, untranslated. With no axis
  // rotation here, the full string doesn't fit a narrow bar slot, so this
  // abbreviates to a 3-letter Dutch month and drops the year entirely.
  it("abbreviates a 'Month Year' label to its Dutch month, dropping the year", () => {
    expect(formatChartLabel("January 2025")).toBe("Jan");
    expect(formatChartLabel("February 2025")).toBe("Feb");
    expect(formatChartLabel("September 2025")).toBe("Sep");
  });

  // Per Kwartaal: confirmed on a real device the API sends "Q1 2025" etc.
  // The generic 4-char fallback was slicing this to "Q1 2", which isn't a
  // real quarter label - this drops the year to leave just "Q1".."Q4".
  it("keeps only the quarter from a 'QN Year' label, dropping the year", () => {
    expect(formatChartLabel("Q1 2025")).toBe("Q1");
    expect(formatChartLabel("Q4 2025")).toBe("Q4");
  });

  // Per Dag: confirmed on a real device the API sends a raw ISO date
  // ("2025-02-25"), which the generic fallback sliced to "2025" (just the
  // year). Reformats to the Dutch "DD-MM" convention instead.
  it("reformats an ISO date label to 'DD-MM'", () => {
    expect(formatChartLabel("2025-02-25")).toBe("25-02");
    expect(formatChartLabel("2025-12-01")).toBe("01-12");
  });

  // Per Jaar: the API sends a bare 4-digit year, already short enough.
  it("leaves a bare year unchanged", () => {
    expect(formatChartLabel("2025")).toBe("2025");
  });

  it("leaves any other label unchanged if it's already short", () => {
    expect(formatChartLabel("Jan")).toBe("Jan");
  });

  // Safety net for any unanticipated label format.
  it("caps an unrecognized, longer label to 4 characters", () => {
    expect(formatChartLabel("Something Weird")).toBe("Some");
  });
});
