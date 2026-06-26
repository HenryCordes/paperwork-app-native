import { ChartColors } from "@/constants/chartColors";

describe("ChartColors", () => {
  it("matches the source app's chart-specific palette (FinancialChart.tsx's revenue/expenses RGBA, converted to hex)", () => {
    // rgba(54, 162, 235, 1) / rgba(72, 202, 255, 1)
    expect(ChartColors.revenue).toEqual({ light: "#36A2EB", dark: "#48CAFF" });
    // rgba(255, 99, 132, 1) / rgba(255, 129, 152, 1)
    expect(ChartColors.expenses).toEqual({ light: "#FF6384", dark: "#FF8198" });
  });
});
