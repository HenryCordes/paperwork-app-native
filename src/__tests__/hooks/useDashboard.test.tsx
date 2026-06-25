import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDashboardStats } from "@/hooks/useDashboard";
import dashboardService from "@/api/services/dashboardService";
import QueryKeys from "@/api/queryKeys";
import type { DashboardStatsResponse, RawDataPoint, PeriodInfo } from "@/api/types/dashboard";

jest.mock("@/api/services/dashboardService", () => ({
  __esModule: true,
  default: { getDashboardStats: jest.fn() },
}));

function renderWithClient<T>(callback: () => T) {
  // Retries off so the isError branch resolves within the test's waitFor window
  // instead of racing TanStack Query's default 3-retry exponential backoff.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makeRawDataPoint = (period: string): RawDataPoint => ({
  period,
  periodKey: period,
  periodType: "monthly",
  totalRevenue: 1000,
  paidRevenue: 800,
  invoiceCount: 5,
  taxCollected: 200,
  totalExpenses: 400,
  expenseCount: 3,
  taxPaid: 80,
  netProfit: 600,
});

const makePeriodInfo = (): PeriodInfo => ({
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  groupingLevel: "monthly",
});

const makeSuccessResponse = (): DashboardStatsResponse => ({
  success: true,
  data: {
    labels: ["Jan", "Feb"],
    turnover: [1000, 1200],
    expenses: [400, 500],
    rawData: [makeRawDataPoint("Jan"), makeRawDataPoint("Feb")],
  },
  source: "pre-calculated",
  periodInfo: makePeriodInfo(),
  summary: {
    totalRevenue: 2200,
    paidRevenue: 1800,
    unpaidRevenue: 400,
    totalExpenses: 900,
    paidExpenses: 700,
    unpaidExpenses: 200,
    netProfit: 1300,
    invoiceCount: 10,
    expenseCount: 6,
  },
});

describe("useDashboardStats", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("called with no params (defaults)", () => {
    it("returns the data the service resolves and calls service with an empty params object", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result } = renderWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(response);
      expect(dashboardService.getDashboardStats).toHaveBeenCalledWith({});
    });

    it("exposes isLoading=true before the service resolves", () => {
      (dashboardService.getDashboardStats as jest.Mock).mockReturnValue(
        new Promise(() => {}),
      );

      const { result } = renderWithClient(() => useDashboardStats());

      expect(result.current.isLoading).toBe(true);
    });

    it("exposes isError=true when the service rejects", async () => {
      (dashboardService.getDashboardStats as jest.Mock).mockRejectedValue(
        new Error("network error"),
      );

      const { result } = renderWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("called with specific params", () => {
    const cases: Array<{
      label: string;
      params: Parameters<typeof useDashboardStats>[0];
      expectedServiceArgs: Record<string, string>;
    }> = [
      {
        label: "periodType only",
        params: { periodType: "monthly" },
        expectedServiceArgs: { periodType: "monthly" },
      },
      {
        label: "periodPreset only",
        params: { periodPreset: "last-3-months" },
        expectedServiceArgs: { periodPreset: "last-3-months" },
      },
      {
        label: "year only",
        params: { year: "2024" },
        expectedServiceArgs: { year: "2024" },
      },
      {
        label: "custom date range",
        params: { periodPreset: "custom", startDate: "2024-01-01", endDate: "2024-06-30" },
        expectedServiceArgs: {
          periodPreset: "custom",
          startDate: "2024-01-01",
          endDate: "2024-06-30",
        },
      },
      {
        label: "all params supplied",
        params: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
        expectedServiceArgs: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
      },
    ];

    it.each(cases)(
      "passes only the supplied params to the service ($label)",
      async ({ params, expectedServiceArgs }) => {
        const response = makeSuccessResponse();
        (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

        const { result } = renderWithClient(() => useDashboardStats(params));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(dashboardService.getDashboardStats).toHaveBeenCalledWith(expectedServiceArgs);
      },
    );
  });

  describe("queryKey shape", () => {
    it("uses QueryKeys.dashboard.stats(params) as the real runtime query key", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result, client } = renderWithClient(() =>
        useDashboardStats({ periodType: "monthly" }),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const queries = client.getQueryCache().getAll();
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual(
        QueryKeys.dashboard.stats({ periodType: "monthly" }),
      );
    });
  });

  describe("undefined/falsy params are excluded from the service call", () => {
    it("does not forward undefined values", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result } = renderWithClient(() =>
        useDashboardStats({ periodType: undefined, year: "2024" }),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(dashboardService.getDashboardStats).toHaveBeenCalledWith({ year: "2024" });
    });
  });
});
