import { render } from "@testing-library/react-native";

import { FinancialChart } from "@/components/charts/FinancialChart";
import { ChartColors } from "@/constants/chartColors";

describe("FinancialChart", () => {
  // react-native-gifted-charts schedules a real setTimeout (default 800ms,
  // see BarChart/index.js's labelsAppear effect) to fade in axis labels.
  // Without fake timers that callback fires after Jest has torn the test
  // environment down, crashing the process even though both assertions
  // already passed.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows a legend with the Dutch labels and formatted totals", () => {
    const { getByText } = render(
      <FinancialChart
        labels={["Jan", "Feb"]}
        turnover={[1000, 1200]}
        expenses={[400, 500]}
      />,
    );

    expect(getByText(/Omzet: €2\.200,00/)).toBeTruthy();
    expect(getByText(/Uitgaven: €900,00/)).toBeTruthy();
  });

  // The source app's bar chart uses its own distinct chart palette
  // (ChartColors), not the app's general primary/danger theme colors used
  // for text - confirmed against a side-by-side screenshot comparison with
  // the source. The two must not be conflated.
  it("colors the legend swatches with the chart-specific palette, not the general theme colors", () => {
    const { getByTestId } = render(
      <FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />,
    );

    expect(getByTestId("legend-swatch-Omzet")).toHaveStyle({
      backgroundColor: ChartColors.revenue.light,
    });
    expect(getByTestId("legend-swatch-Uitgaven")).toHaveStyle({
      backgroundColor: ChartColors.expenses.light,
    });
  });

  it("shows the Dutch empty-state message when there are no labels", () => {
    const { getByText } = render(
      <FinancialChart labels={[]} turnover={[]} expenses={[]} />,
    );

    expect(
      getByText("Geen gegevens beschikbaar voor deze periode"),
    ).toBeTruthy();
  });
});
