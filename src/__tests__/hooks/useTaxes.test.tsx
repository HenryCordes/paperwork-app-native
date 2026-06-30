import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Share } from "react-native";
import type { ReactNode } from "react";

import { useTaxPeriods, useTaxSummary, useTaxDeadline, useExportTaxReturn } from "@/hooks/useTaxes";
import taxesService from "@/api/services/taxesService";
import QueryKeys from "@/api/queryKeys";
import type { TaxPeriodsResponse, TaxSummaryResponse, TaxDeadlineResponse, TaxExportRequest } from "@/api/types/taxes";

jest.mock("@/api/services/taxesService", () => ({
  __esModule: true,
  default: {
    getTaxPeriods: jest.fn(),
    getTaxSummary: jest.fn(),
    getNextDeadline: jest.fn(),
    exportTaxReturn: jest.fn(),
  },
}));

// Track write calls on the mock File instance
const mockFileWrite = jest.fn();
const mockFileUri = "file:///documents/btw-export-quarterly-Q1-2026.xlsx";

jest.mock("expo-file-system", () => {
  const EncodingType = { Base64: "base64", UTF8: "utf8" };

  function MockDirectory() {}

  function MockFile(_dir: unknown, name: string) {
    // @ts-expect-error -- mock function used as constructor
    this.uri = `file:///documents/${name}`;
    // @ts-expect-error -- mock function used as constructor
    this.write = mockFileWrite;
  }

  const Paths = { document: { uri: "file:///documents/" } };

  return { Directory: MockDirectory, File: MockFile, Paths, EncodingType };
});

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makePeriodsResponse = (): TaxPeriodsResponse => ({
  success: true,
  data: {
    periodTypes: [{ value: "quarterly", label: "Kwartaal" }],
    periods: { monthly: [], quarterly: [{ value: "Q1", label: "Q1 2026" }], yearly: [] },
    years: [2026],
  },
});

const makeSummaryResponse = (): TaxSummaryResponse => ({
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
      laagTarief9: { basis: 0, btw: 0 },
      laagsteTarief6: { basis: 0, btw: 0 },
      overige: { basis: 0, btw: 0 },
    },
    voorbelasting: { totaal: 50 },
    teBetalen: 160,
    invoiceCount: 5,
    expenseCount: 3,
  },
});

const makeDeadlineResponse = (): TaxDeadlineResponse => ({
  success: true,
  data: {
    deadline: "2026-04-30",
    label: "Q1 2026",
    daysUntilDeadline: 10,
    periodType: "quarterly",
  },
});

describe("useTaxPeriods", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves", async () => {
    const response = makePeriodsResponse();
    (taxesService.getTaxPeriods as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useTaxPeriods());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("exposes isLoading=true before the service resolves", () => {
    (taxesService.getTaxPeriods as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useTaxPeriods());

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (taxesService.getTaxPeriods as jest.Mock).mockRejectedValue(new Error("network error"));

    const { result } = renderWithClient(() => useTaxPeriods());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("uses QueryKeys.taxes.periods() as the runtime query key", async () => {
    (taxesService.getTaxPeriods as jest.Mock).mockResolvedValue(makePeriodsResponse());

    const { result, client } = renderWithClient(() => useTaxPeriods());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.taxes.periods());
  });
});

describe("useTaxSummary", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const params = { periodType: "quarterly" as const, period: "Q1", year: 2026 };

  it("returns the data the service resolves", async () => {
    const response = makeSummaryResponse();
    (taxesService.getTaxSummary as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useTaxSummary(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("does not fetch when period is empty", () => {
    const { result } = renderWithClient(() =>
      useTaxSummary({ ...params, period: "" }),
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(taxesService.getTaxSummary).not.toHaveBeenCalled();
  });

  it("does not fetch when year is 0", () => {
    const { result } = renderWithClient(() =>
      useTaxSummary({ ...params, year: 0 }),
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(taxesService.getTaxSummary).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is explicitly false", () => {
    (taxesService.getTaxSummary as jest.Mock).mockResolvedValue(makeSummaryResponse());

    const { result } = renderWithClient(() => useTaxSummary(params, false));

    expect(result.current.fetchStatus).toBe("idle");
    expect(taxesService.getTaxSummary).not.toHaveBeenCalled();
  });

  it("exposes isError=true when the service rejects", async () => {
    (taxesService.getTaxSummary as jest.Mock).mockRejectedValue(new Error("fout"));

    const { result } = renderWithClient(() => useTaxSummary(params));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("uses QueryKeys.taxes.summary(params) as the runtime query key", async () => {
    (taxesService.getTaxSummary as jest.Mock).mockResolvedValue(makeSummaryResponse());

    const { result, client } = renderWithClient(() => useTaxSummary(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.taxes.summary(params));
  });
});

describe("useTaxDeadline", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves", async () => {
    const response = makeDeadlineResponse();
    (taxesService.getNextDeadline as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useTaxDeadline("quarterly"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("exposes isError=true when the service rejects", async () => {
    (taxesService.getNextDeadline as jest.Mock).mockRejectedValue(new Error("fout"));

    const { result } = renderWithClient(() => useTaxDeadline("quarterly"));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("uses QueryKeys.taxes.deadline(periodType) as the runtime query key", async () => {
    (taxesService.getNextDeadline as jest.Mock).mockResolvedValue(makeDeadlineResponse());

    const { result, client } = renderWithClient(() => useTaxDeadline("quarterly"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.taxes.deadline("quarterly"));
  });
});

describe("useExportTaxReturn", () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  });

  afterEach(() => {
    jest.clearAllMocks();
    shareSpy.mockRestore();
  });

  const makeParams = (): TaxExportRequest => ({
    periodType: "quarterly",
    period: "Q1",
    year: 2026,
    format: "excel",
    includeDetails: false,
  });

  it("calls exportTaxReturn, writes the file, and calls Share.share with the file path", async () => {
    (taxesService.exportTaxReturn as jest.Mock).mockResolvedValue("SGVsbG8="); // base64 "Hello"

    const { result } = renderWithClient(() => useExportTaxReturn());

    act(() => {
      result.current.mutate(makeParams());
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(taxesService.exportTaxReturn).toHaveBeenCalledWith(makeParams());
    expect(mockFileWrite).toHaveBeenCalledWith("SGVsbG8=", { encoding: "base64" });
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("btw-export-quarterly-Q1-2026.xlsx"),
      }),
    );
  });

  it("uses .csv extension for csv format", async () => {
    (taxesService.exportTaxReturn as jest.Mock).mockResolvedValue("dGVzdA==");

    const { result } = renderWithClient(() => useExportTaxReturn());
    const csvParams: TaxExportRequest = { ...makeParams(), format: "csv" };

    act(() => {
      result.current.mutate(csvParams);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(".csv"),
      }),
    );
  });

  it("exposes isError=true and the Dutch message when the export service rejects", async () => {
    (taxesService.exportTaxReturn as jest.Mock).mockRejectedValue(
      new Error("Fout bij exporteren van BTW aangifte"),
    );

    const { result } = renderWithClient(() => useExportTaxReturn());

    act(() => {
      result.current.mutate(makeParams());
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Fout bij exporteren van BTW aangifte");
  });
});

// Suppress unused variable warning — mockFileUri is used for documentation purposes
void mockFileUri;
