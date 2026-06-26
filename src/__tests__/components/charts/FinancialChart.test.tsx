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

  // Bug, confirmed on a real device: the legend rendered flush against the
  // chart's bottom edge with no breathing room - same issue already fixed
  // for PieChart's legend, also needed here.
  it("adds top margin between the chart and its legend", () => {
    const { getByTestId } = render(
      <FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />,
    );
    expect(getByTestId("financial-chart-legend-wrapper")).toHaveStyle({
      marginTop: 16,
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

  // Bug, confirmed on a real device: the empty-state message rendered in the
  // default (near-black) text color, inconsistent with every other
  // secondary-tone message on this screen (e.g. "Laden...").
  it("shows the empty-state message in the secondary (gray) text color", () => {
    const { getByText } = render(
      <FinancialChart labels={[]} turnover={[]} expenses={[]} />,
    );

    expect(
      getByText("Geen gegevens beschikbaar voor deze periode"),
    ).toHaveStyle({ color: "#636469" });
  });

  // End-to-end check that the chart abbreviates whatever period-type label
  // the API sends, rather than showing the raw, too-long string.
  it("abbreviates x-axis labels for each period type the API can send", () => {
    const { getByText } = render(
      <FinancialChart
        labels={["February 2025", "Q1 2025", "2025-02-25", "2025"]}
        turnover={[1000, 1200, 900, 5000]}
        expenses={[400, 500, 300, 1000]}
      />,
    );

    expect(getByText("Feb")).toBeTruthy();
    expect(getByText("Q1")).toBeTruthy();
    expect(getByText("25-02")).toBeTruthy();
    expect(getByText("2025")).toBeTruthy();
  });
});
