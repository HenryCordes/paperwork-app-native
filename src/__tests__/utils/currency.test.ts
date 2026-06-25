import { formatCurrency } from "@/utils/currency";

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
