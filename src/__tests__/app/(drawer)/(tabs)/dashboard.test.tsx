import { render, fireEvent } from "@testing-library/react-native";

import Dashboard from "@/app/(drawer)/(tabs)/dashboard";
import { useDashboardStats } from "@/hooks/useDashboard";

jest.mock("@/hooks/useDashboard");

function mockStats(
  overrides: Partial<Omit<ReturnType<typeof useDashboardStats>, "error">> & {
    error?: Error | null;
  },
) {
  (useDashboardStats as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  });
}

describe("Dashboard screen", () => {
  // react-native-gifted-charts's BarChart (rendered for real by FinancialChart
  // below) schedules a real setTimeout (default 800ms) to fade in axis labels.
  // Without fake timers that callback fires after Jest has torn the test
  // environment down, crashing the process even though assertions already
  // passed. See src/__tests__/components/charts/FinancialChart.test.tsx.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("shows a loading state while the query is pending", () => {
    mockStats({ isLoading: true });
    const { queryByText } = render(<Dashboard />);
    expect(queryByText("Omzet")).toBeNull();
  });

  it("shows the Dutch error message when the query fails", () => {
    mockStats({ isError: true, error: new Error("network down") });
    const { getByText } = render(<Dashboard />);
    expect(getByText("network down")).toBeTruthy();
  });

  it("falls back to the generic Dutch error message when the error has no message", () => {
    mockStats({ isError: true, error: null });
    const { getByText } = render(<Dashboard />);
    expect(
      getByText("Kan dashboardgegevens niet laden. Probeer het opnieuw."),
    ).toBeTruthy();
  });

  it("shows Winst (profit, green) when netProfit is positive", () => {
    mockStats({
      data: {
        success: true,
        data: {
          labels: ["Jan"],
          turnover: [1000],
          expenses: [400],
          rawData: [
            {
              period: "Jan",
              periodKey: "Jan",
              periodType: "monthly",
              totalRevenue: 1000,
              paidRevenue: 1000,
              invoiceCount: 1,
              taxCollected: 0,
              totalExpenses: 400,
              expenseCount: 1,
              taxPaid: 0,
              netProfit: 600,
            },
          ],
        },
        source: "pre-calculated",
        periodInfo: { startDate: "", endDate: "", groupingLevel: "monthly" },
      },
    });

    const { getByText } = render(<Dashboard />);

    expect(getByText("Winst")).toBeTruthy();
    expect(getByText(/€600,00/)).toBeTruthy();
  });

  it("shows Verlies (loss, red) when netProfit is negative", () => {
    mockStats({
      data: {
        success: true,
        data: {
          labels: ["Jan"],
          turnover: [400],
          expenses: [1000],
          rawData: [
            {
              period: "Jan",
              periodKey: "Jan",
              periodType: "monthly",
              totalRevenue: 400,
              paidRevenue: 400,
              invoiceCount: 1,
              taxCollected: 0,
              totalExpenses: 1000,
              expenseCount: 1,
              taxPaid: 0,
              netProfit: -600,
            },
          ],
        },
        source: "pre-calculated",
        periodInfo: { startDate: "", endDate: "", groupingLevel: "monthly" },
      },
    });

    const { getByText } = render(<Dashboard />);

    expect(getByText("Verlies")).toBeTruthy();
  });

  it("toggles the period selector visibility on funnel button press", () => {
    mockStats({});
    const { getByLabelText, queryByText } = render(<Dashboard />);

    expect(queryByText("Per")).toBeNull();
    fireEvent.press(getByLabelText("Periode wijzigen"));
    expect(queryByText("Per")).toBeTruthy();
  });
});
