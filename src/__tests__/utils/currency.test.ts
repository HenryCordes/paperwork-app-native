import { formatCurrency, formatCurrencyWhole } from "@/utils/currency";

describe("formatCurrency", () => {
  it("formats with a comma decimal separator", () => {
    expect(formatCurrency(12.5)).toBe("12,50");
  });

  it("formats whole numbers with two decimals", () => {
    expect(formatCurrency(0)).toBe("0,00");
  });

  it("uses a period thousands separator above 1000", () => {
    expect(formatCurrency(1234.5)).toBe("1.234,50");
  });
});

describe("formatCurrencyWhole", () => {
  it("rounds to the nearest whole euro, no decimals", () => {
    expect(formatCurrencyWhole(14000)).toBe("14.000");
  });

  it("rounds rather than truncates", () => {
    expect(formatCurrencyWhole(14000.6)).toBe("14.001");
  });
});
