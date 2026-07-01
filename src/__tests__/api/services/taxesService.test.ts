import { TaxesService } from "@/api/services/taxesService";
import type { TaxExportRequest, TaxSummaryRequest } from "@/api/types/taxes";

describe("TaxesService", () => {
  const mockAxios = { get: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeSummaryParams = (): TaxSummaryRequest => ({
    periodType: "quarterly",
    period: "Q1",
    year: 2026,
  });

  const makeExportParams = (): TaxExportRequest => ({
    periodType: "quarterly",
    period: "Q1",
    year: 2026,
    format: "excel",
    includeDetails: false,
  });

  describe("getTaxPeriods", () => {
    it("calls /btw-export/periods and returns the response", async () => {
      const response = {
        success: true,
        data: {
          periodTypes: [{ value: "quarterly", label: "Kwartaal" }],
          periods: { monthly: [], quarterly: [], yearly: [] },
          years: [2026],
        },
      };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new TaxesService(mockAxios as never);

      const result = await service.getTaxPeriods();

      expect(mockAxios.get).toHaveBeenCalledWith("btw-export/periods");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new TaxesService(mockAxios as never);

      await expect(service.getTaxPeriods()).rejects.toThrow("Fout bij ophalen BTW perioden");
    });

    it("uses the server message when present", async () => {
      const axiosError = { response: { data: { message: "Server fout" } } };
      mockAxios.get.mockRejectedValue(axiosError);
      const service = new TaxesService(mockAxios as never);

      await expect(service.getTaxPeriods()).rejects.toThrow("Server fout");
    });
  });

  describe("getTaxSummary", () => {
    it("calls /btw-export/summary with params and returns the response", async () => {
      const response = { success: true, data: {} };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new TaxesService(mockAxios as never);
      const params = makeSummaryParams();

      const result = await service.getTaxSummary(params);

      expect(mockAxios.get).toHaveBeenCalledWith("btw-export/summary", { params });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new TaxesService(mockAxios as never);

      await expect(service.getTaxSummary(makeSummaryParams())).rejects.toThrow(
        "Fout bij ophalen BTW overzicht",
      );
    });

    it("uses the server message when present", async () => {
      const axiosError = { response: { data: { message: "Onbekende periode" } } };
      mockAxios.get.mockRejectedValue(axiosError);
      const service = new TaxesService(mockAxios as never);

      await expect(service.getTaxSummary(makeSummaryParams())).rejects.toThrow(
        "Onbekende periode",
      );
    });
  });

  describe("getNextDeadline", () => {
    it("calls /btw-export/deadline with the given periodType", async () => {
      const response = {
        success: true,
        data: {
          deadline: "2026-04-30",
          label: "Q1 2026",
          daysUntilDeadline: 10,
          periodType: "quarterly",
        },
      };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new TaxesService(mockAxios as never);

      const result = await service.getNextDeadline("quarterly");

      expect(mockAxios.get).toHaveBeenCalledWith("btw-export/deadline", {
        params: { periodType: "quarterly" },
      });
      expect(result).toEqual(response);
    });

    it("defaults to quarterly when no periodType is given", async () => {
      mockAxios.get.mockResolvedValue({ data: { success: true, data: {} } });
      const service = new TaxesService(mockAxios as never);

      await service.getNextDeadline();

      expect(mockAxios.get).toHaveBeenCalledWith("btw-export/deadline", {
        params: { periodType: "quarterly" },
      });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new TaxesService(mockAxios as never);

      await expect(service.getNextDeadline()).rejects.toThrow("Fout bij ophalen BTW deadline");
    });
  });

  describe("exportTaxReturn", () => {
    it("calls /btw-export/export with params and arraybuffer responseType", async () => {
      // Simulate an ArrayBuffer with a few bytes
      const buffer = new ArrayBuffer(4);
      new Uint8Array(buffer).set([72, 101, 108, 108]); // "Hell"
      mockAxios.get.mockResolvedValue({ data: buffer });
      const service = new TaxesService(mockAxios as never);
      const params = makeExportParams();

      const result = await service.exportTaxReturn(params);

      expect(mockAxios.get).toHaveBeenCalledWith("btw-export/export", {
        params,
        responseType: "arraybuffer",
      });
      // Exact base64 of the "Hell" bytes — guards the manual byte->base64
      // encoding against off-by-one / mis-encode regressions.
      expect(result).toBe("SGVsbA==");
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new TaxesService(mockAxios as never);

      await expect(service.exportTaxReturn(makeExportParams())).rejects.toThrow(
        "Fout bij exporteren van BTW aangifte",
      );
    });
  });
});
