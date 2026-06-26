import { pairBarData } from "@/components/charts/barPairing";

describe("pairBarData", () => {
  it("interleaves turnover and expenses into label-carrying pairs", () => {
    const result = pairBarData(["Jan", "Feb"], [1000, 1200], [400, 500]);

    expect(result).toEqual([
      { value: 1000, frontColor: "#0054e9", spacing: 2, label: "Jan" },
      { value: 400, frontColor: "#c5000f" },
      { value: 1200, frontColor: "#0054e9", spacing: 2, label: "Feb" },
      { value: 500, frontColor: "#c5000f" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(pairBarData([], [], [])).toEqual([]);
  });

  it("accepts custom colors for the two series", () => {
    const result = pairBarData(["Jan"], [1000], [400], {
      turnoverColor: "#111111",
      expensesColor: "#222222",
    });

    expect(result[0].frontColor).toBe("#111111");
    expect(result[1].frontColor).toBe("#222222");
  });

  // Confirmed against the source app's own screenshot: it shows the raw
  // "February 2025" style label as-is, untranslated and unabbreviated - an
  // earlier abbreviation pass here was based on a mistaken assumption and
  // has been reverted.
  it("passes labels through unchanged", () => {
    const result = pairBarData(["January 2025", "March 2025"], [1000, 1200], [400, 500]);

    expect(result[0].label).toBe("January 2025");
    expect(result[2].label).toBe("March 2025");
  });
});
