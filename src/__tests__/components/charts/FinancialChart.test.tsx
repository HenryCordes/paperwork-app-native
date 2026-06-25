import { render } from "@testing-library/react-native";

import { FinancialChart } from "@/components/charts/FinancialChart";

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

  it("shows the Dutch empty-state message when there are no labels", () => {
    const { getByText } = render(
      <FinancialChart labels={[]} turnover={[]} expenses={[]} />,
    );

    expect(
      getByText("Geen gegevens beschikbaar voor deze periode"),
    ).toBeTruthy();
  });
});
