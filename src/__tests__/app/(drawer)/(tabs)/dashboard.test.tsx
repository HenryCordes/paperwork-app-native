import { render, fireEvent } from "@testing-library/react-native";
import { useNavigation } from "expo-router";

import Dashboard from "@/app/(drawer)/(tabs)/dashboard";
import { useDashboardStats } from "@/hooks/useDashboard";

jest.mock("@/hooks/useDashboard");

// The funnel button now lives in the real navigation header (set via
// navigation.setOptions), not in the screen's own content - matching the
// source, where the hamburger/title/funnel row is the native nav bar, and
// "Overzicht ..." is a separate centered line below it.
const mockSetOptions = jest.fn();
jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
}));

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
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
  });

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
    // Bug, confirmed on a real device: summary values rendered pure
    // white/black (colors.text), too high-contrast against the dimmer
    // uppercase labels above them - should use the same secondary tone.
    expect(getByText(/€600,00/)).toHaveStyle({ color: "#636469" });
    // Bug, confirmed on a real device: the value was semi-bold (600);
    // should be normal weight.
    expect(getByText(/€600,00/)).not.toHaveStyle({ fontWeight: "600" });
  });

  it("shows the standalone period label in a normal (not bold) weight", () => {
    mockStats({});
    const { getAllByText } = render(<Dashboard />);
    // First occurrence is the standalone title; the second is the bar-chart
    // card's own title, which is intentionally bold and untouched by this fix.
    const [standaloneTitle] = getAllByText("Overzicht Dit Jaar");
    expect(standaloneTitle).not.toHaveStyle({ fontWeight: "600" });
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

  it("toggles the period selector visibility when the header's funnel button is pressed", () => {
    mockStats({});
    const { queryByText } = render(<Dashboard />);

    expect(queryByText("Per")).toBeNull();

    const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
    const { getByLabelText } = render(headerRight());
    fireEvent.press(getByLabelText("Periode wijzigen"));

    expect(queryByText("Per")).toBeTruthy();
  });

  it("shows each chart inside its own titled card, matching the source's two separate chart cards", () => {
    mockStats({
      data: {
        success: true,
        data: { labels: ["Jan"], turnover: [1000], expenses: [400], rawData: [] },
        source: "pre-calculated",
        periodInfo: { startDate: "", endDate: "", groupingLevel: "monthly" },
      },
    });

    const { getAllByText, getByText } = render(<Dashboard />);

    // The period label appears twice: once as the page's own title, once
    // again as the bar-chart card's title - matching the source exactly.
    expect(getAllByText("Overzicht Dit Jaar")).toHaveLength(2);
    expect(getByText("Omzet vs Uitgaven")).toBeTruthy();
  });

  // Bug, confirmed on a real device: uppercase "UITGAVEN" wrapped onto two
  // lines inside its (narrow, one-of-three) card.
  it("keeps each summary stat label on a single line", () => {
    mockStats({});
    const { getByText } = render(<Dashboard />);

    expect(getByText("Omzet").props.numberOfLines).toBe(1);
    expect(getByText("Uitgaven").props.numberOfLines).toBe(1);
  });

  it("sets the header's right-side button to a funnel icon, matching the source", () => {
    mockStats({});
    render(<Dashboard />);

    const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
    const { getByTestId } = render(headerRight());
    expect(getByTestId("period-filter-icon")).toBeTruthy();
  });

  it("shows the period label as its own centered line, separate from the header", () => {
    mockStats({});
    const { getAllByText } = render(<Dashboard />);
    // Appears twice: once as this standalone line, once as the bar-chart
    // card's own title - both already covered by an earlier test; this one
    // only needs to confirm the standalone line itself renders.
    expect(getAllByText("Overzicht Dit Jaar").length).toBeGreaterThanOrEqual(1);
  });

  // Bug, confirmed on a real device: once the real navigation header was
  // added (which already reserves its own safe-area-correct space above
  // this screen), still adding insets.top here double-counted the inset,
  // producing a large empty gap below the header.
  it("uses only its own base padding at the top, not the safe-area inset on top of the real header", () => {
    mockStats({});
    const { getByTestId } = render(<Dashboard />);

    expect(getByTestId("dashboard-screen")).toHaveStyle({ paddingTop: 16 });
  });

  // Bug: the screen's content (header, summary cards, both charts and their
  // legends) has no scroll container anywhere in its ancestor chain, so on a
  // real device anything past the viewport height - the pie chart and its
  // legend, in practice - was simply laid out off-screen, not missing.
  it("wraps its content in a scroll view so charts below the fold are reachable", () => {
    mockStats({});
    const { getByTestId } = render(<Dashboard />);
    expect(getByTestId("dashboard-scroll")).toBeTruthy();
  });
});
