import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Taxes from "@/app/(drawer)/(tabs)/taxes";
import { useTaxPeriods, useTaxSummary, useExportTaxReturn } from "@/hooks/useTaxes";
import type {
  TaxPeriodsResponse,
  TaxSummaryResponse,
} from "@/api/types/taxes";

jest.mock("@/hooks/useTaxes");
jest.mock("@/components/VatReturnDeadlineCard", () => ({
  VatReturnDeadlineCard: () => null,
}));

function makePeriodsResponse(): TaxPeriodsResponse {
  return {
    success: true,
    data: {
      periodTypes: [
        { value: "quarterly", label: "Kwartaal" },
        { value: "monthly", label: "Maandelijks" },
      ],
      periods: {
        monthly: [{ value: "1", label: "Januari" }],
        quarterly: [
          { value: "Q1", label: "Kwartaal 1" },
          { value: "Q2", label: "Kwartaal 2" },
        ],
        yearly: [],
      },
      years: [2025, 2026],
    },
  };
}

function makeSummaryResponse(): TaxSummaryResponse {
  return {
    success: true,
    data: {
      period: {
        type: "quarterly",
        period: "Q1",
        year: 2026,
        dateRange: { start: "2026-01-01", end: "2026-03-31" },
      },
      omzet: {
        hoogTarief21: { basis: 1000, btw: 210 },
        laagTarief9: { basis: 500, btw: 45 },
        laagsteTarief6: { basis: 0, btw: 0 },
        overige: { basis: 0, btw: 0 },
      },
      voorbelasting: { totaal: 50 },
      teBetalen: 205,
      invoiceCount: 5,
      expenseCount: 3,
    },
  };
}

function mockTaxPeriods(overrides: Partial<ReturnType<typeof useTaxPeriods>>) {
  (useTaxPeriods as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

function mockTaxSummary(overrides: Partial<ReturnType<typeof useTaxSummary>>) {
  (useTaxSummary as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

function mockExport(overrides: Partial<ReturnType<typeof useExportTaxReturn>>) {
  (useExportTaxReturn as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
    ...overrides,
  });
}

function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <Taxes />
    </QueryClientProvider>,
  );
}

describe("Taxes screen", () => {
  beforeEach(() => {
    mockTaxPeriods({});
    mockTaxSummary({});
    mockExport({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading indicator while periods are loading", () => {
    mockTaxPeriods({ isLoading: true });

    const { getByTestId } = renderScreen();

    expect(getByTestId("taxes-loading")).toBeTruthy();
  });

  it("renders the period-type dropdown with options from the API", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });

    const { getByText } = renderScreen();

    // The current period type label should be visible
    expect(getByText("Kwartaal")).toBeTruthy();
  });

  it("renders year dropdown with years from the API", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });

    const { getByText } = renderScreen();

    expect(getByText(/2026/)).toBeTruthy();
  });

  it("renders the period dropdown", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });

    const { getByTestId } = renderScreen();

    expect(getByTestId("taxes-period-dropdown")).toBeTruthy();
  });

  it("renders the format dropdown with Excel as default", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });

    const { getByText } = renderScreen();

    expect(getByText(/Excel/i)).toBeTruthy();
  });

  it("shows the summary section when useTaxSummary returns data", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockTaxSummary({ data: makeSummaryResponse() });

    const { getByTestId } = renderScreen();

    expect(getByTestId("taxes-summary")).toBeTruthy();
  });

  it("shows the teBetalen amount in the summary", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockTaxSummary({ data: makeSummaryResponse() });

    const { getByTestId, getByText } = renderScreen();

    expect(getByTestId("taxes-summary")).toBeTruthy();
    // teBetalen = 205 -> formatted as currency nl-NL
    expect(getByText(/205/)).toBeTruthy();
  });

  it("shows the invoice and expense counts in the summary", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockTaxSummary({ data: makeSummaryResponse() });

    const { getAllByText } = renderScreen();

    // invoiceCount=5, expenseCount=3 are shown
    expect(getAllByText("5").length).toBeGreaterThan(0);
    expect(getAllByText("3").length).toBeGreaterThan(0);
  });

  it("shows a loading indicator for summary while fetching", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockTaxSummary({ isLoading: true });

    const { getByTestId } = renderScreen();

    expect(getByTestId("taxes-summary-loading")).toBeTruthy();
  });

  it("renders the Exporteren button", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });

    const { getByText } = renderScreen();

    expect(getByText("Exporteren")).toBeTruthy();
  });

  it("calls mutateAsync with correct params when the export button is pressed", async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({ success: true, message: "OK" });
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockTaxSummary({});
    mockExport({ mutateAsync: mockMutateAsync, isPending: false });

    const { getByText } = renderScreen();
    fireEvent.press(getByText("Exporteren"));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "excel",
        includeDetails: false,
      }),
    );
  });

  it("shows pending state on the export button while exporting", () => {
    mockTaxPeriods({ data: makePeriodsResponse() });
    mockExport({ isPending: true, mutateAsync: jest.fn() });

    const { queryByText } = renderScreen();

    expect(queryByText("Exporteren")).toBeNull();
  });
});
