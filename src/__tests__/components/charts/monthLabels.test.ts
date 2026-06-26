import { toDutchChartLabel } from "@/components/charts/monthLabels";

describe("toDutchChartLabel", () => {
  // Bug, confirmed on a real device: the API returns "January 2025"
  // (English, full), and translating to the full Dutch name ("Januari
  // 2025") made an already-tight chart x-axis label even longer, truncating
  // to single letters. Abbreviating to a 3-letter Dutch month + 2-digit
  // year fits the available space and is still unambiguous.
  it("abbreviates an English month name and shortens the year", () => {
    expect(toDutchChartLabel("January 2025")).toBe("jan 25");
    expect(toDutchChartLabel("March 2025")).toBe("mrt 25");
    expect(toDutchChartLabel("May 2025")).toBe("mei 25");
    expect(toDutchChartLabel("July 2025")).toBe("jul 25");
    expect(toDutchChartLabel("December 2024")).toBe("dec 24");
  });

  it("returns labels it doesn't recognize unchanged", () => {
    expect(toDutchChartLabel("Q1 2025")).toBe("Q1 2025");
    expect(toDutchChartLabel("2025")).toBe("2025");
  });
});
