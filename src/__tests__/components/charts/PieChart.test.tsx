import { render } from "@testing-library/react-native";

import { PieChart } from "@/components/charts/PieChart";
import { ChartColors } from "@/constants/chartColors";

describe("PieChart", () => {
  it("shows a legend with both slices' Dutch labels and formatted values", () => {
    const { getByText } = render(<PieChart revenue={2200} expenses={900} />);

    expect(getByText(/Omzet: €2\.200,00/)).toBeTruthy();
    expect(getByText(/Uitgaven: €900,00/)).toBeTruthy();
  });

  // The source app's pie slice colors are hardcoded, not theme-aware (no
  // dark-mode override exists in PieChart.tsx) - ported as the same fixed
  // values regardless of light/dark scheme.
  it("colors the legend swatches with the chart-specific palette, not the general theme colors", () => {
    const { getByTestId } = render(<PieChart revenue={2200} expenses={900} />);

    expect(getByTestId("legend-swatch-Omzet")).toHaveStyle({
      backgroundColor: ChartColors.revenue.light,
    });
    expect(getByTestId("legend-swatch-Uitgaven")).toHaveStyle({
      backgroundColor: ChartColors.expenses.light,
    });
  });
});
