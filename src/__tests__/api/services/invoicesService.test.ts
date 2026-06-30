import { InvoicesService } from "@/api/services/invoicesService";
import { InvoiceCreateUpdateRequest } from "@/api/types/invoices";

describe("InvoicesService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeLine = () => ({
    _id: "l1",
    description: "Consultancy",
    numberOfItems: 2,
    priceIncludingTax: 100,
    taxRate: 21,
    totalLinePrice: 200,
  });

  const makeInvoiceData = (overrides: Partial<InvoiceCreateUpdateRequest> = {}) => ({
    contactId: "c1",
    contactName: "Acme BV",
    invoiceNumber: 42,
    invoiceDate: "2026-01-01",
    priceIncludingTax: 200,
    invoiceLines: [makeLine()],
    ...overrides,
  });

  describe("getInvoices", () => {
    it("defaults to {offset:0, limit:10} when called with no params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new InvoicesService(mockAxios as never);

      const result = await service.getInvoices();

      expect(mockAxios.get).toHaveBeenCalledWith(
        "/invoices?offset=0&limit=10",
      );
      expect(result).toEqual(response);
    });

    it("forwards explicit params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new InvoicesService(mockAxios as never);

      await service.getInvoices({ offset: 20, limit: 5 });

      expect(mockAxios.get).toHaveBeenCalledWith(
        "/invoices?offset=20&limit=5",
      );
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new InvoicesService(mockAxios as never);

      await expect(service.getInvoices()).rejects.toThrow("Fout bij ophalen facturen");
    });
  });

  describe("getInvoiceById", () => {
    it("throws without calling axios when id is undefined", async () => {
      const service = new InvoicesService(mockAxios as never);

      await expect(service.getInvoiceById(undefined as never)).rejects.toThrow(
        "Geen geldig factuur ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('throws without calling axios when id is "create"', async () => {
      const service = new InvoicesService(mockAxios as never);

      await expect(service.getInvoiceById("create")).rejects.toThrow(
        "Geen geldig factuur ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it("fetches the invoice detail for a real id", async () => {
      const response = { success: true, data: makeInvoiceData() };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new InvoicesService(mockAxios as never);

      const result = await service.getInvoiceById("inv1");

      expect(mockAxios.get).toHaveBeenCalledWith("/invoice/inv1");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new InvoicesService(mockAxios as never);

      await expect(service.getInvoiceById("inv1")).rejects.toThrow(
        "Fout bij ophalen factuur",
      );
    });
  });

  describe("createOrUpdateInvoice", () => {
    it("posts to the combined endpoint", async () => {
      const response = { success: true, data: makeInvoiceData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new InvoicesService(mockAxios as never);
      const data = makeInvoiceData();

      const result = await service.createOrUpdateInvoice(data);

      expect(mockAxios.post).toHaveBeenCalledWith("/invoice", data);
      expect(result).toEqual(response);
    });

    it("rethrows a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new InvoicesService(mockAxios as never);

      await expect(service.createOrUpdateInvoice(makeInvoiceData())).rejects.toThrow(
        "Fout bij opslaan factuur",
      );
    });

    it("rethrows a Dutch fallback message when _id is present", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new InvoicesService(mockAxios as never);

      await expect(
        service.createOrUpdateInvoice(makeInvoiceData({ _id: "inv1" })),
      ).rejects.toThrow("Fout bij opslaan factuur");
    });
  });

  describe("deleteInvoice", () => {
    it("calls DELETE on the invoice endpoint", async () => {
      mockAxios.delete.mockResolvedValue({});
      const service = new InvoicesService(mockAxios as never);

      const result = await service.deleteInvoice("inv1");

      expect(mockAxios.delete).toHaveBeenCalledWith("/invoices/inv1");
      expect(result).toEqual({ success: true });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new InvoicesService(mockAxios as never);

      await expect(service.deleteInvoice("inv1")).rejects.toThrow(
        "Fout bij verwijderen factuur",
      );
    });
  });
});
