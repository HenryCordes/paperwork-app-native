import { ExpensesService } from "@/api/services/expensesService";
import { ExpenseCreateUpdateRequest } from "@/api/types/expenses";

describe("ExpensesService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeExpenseData = (overrides: Partial<ExpenseCreateUpdateRequest> = {}) => ({
    contactId: "c1",
    contactName: "Acme",
    expenseNumber: 1,
    expenseDate: "2026-01-01",
    info: "Bon",
    tax: 21,
    taxLow: 0,
    price: 100,
    priceWOTaxes: 0,
    ...overrides,
  });

  describe("getExpenses", () => {
    it("defaults to {offset:0, limit:10} when called with no params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ExpensesService(mockAxios as never);

      const result = await service.getExpenses();

      expect(mockAxios.get).toHaveBeenCalledWith("expenses", {
        params: { offset: 0, limit: 10 },
      });
      expect(result).toEqual(response);
    });

    it("forwards explicit params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ExpensesService(mockAxios as never);

      await service.getExpenses({ offset: 20, limit: 5 });

      expect(mockAxios.get).toHaveBeenCalledWith("expenses", {
        params: { offset: 20, limit: 5 },
      });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new ExpensesService(mockAxios as never);

      await expect(service.getExpenses()).rejects.toThrow("Fout bij ophalen kosten");
    });
  });

  describe("getExpenseById", () => {
    it("throws without calling axios when id is undefined", async () => {
      const service = new ExpensesService(mockAxios as never);

      await expect(service.getExpenseById(undefined)).rejects.toThrow(
        "Geen geldig kosten ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('throws without calling axios when id is "create"', async () => {
      const service = new ExpensesService(mockAxios as never);

      await expect(service.getExpenseById("create")).rejects.toThrow(
        "Geen geldig kosten ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it("fetches the expense detail for a real id", async () => {
      const response = { success: true, data: makeExpenseData() };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ExpensesService(mockAxios as never);

      const result = await service.getExpenseById("e1");

      expect(mockAxios.get).toHaveBeenCalledWith("expense/e1");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new ExpensesService(mockAxios as never);

      await expect(service.getExpenseById("e1")).rejects.toThrow(
        "Fout bij ophalen kosten details",
      );
    });
  });

  describe("createOrUpdateExpense", () => {
    it("posts to the combined endpoint", async () => {
      const response = { success: true, data: makeExpenseData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new ExpensesService(mockAxios as never);
      const data = makeExpenseData();

      const result = await service.createOrUpdateExpense(data);

      expect(mockAxios.post).toHaveBeenCalledWith("expense", data);
      expect(result).toEqual(response);
    });

    it('rethrows a Dutch "aanmaken" fallback message when _id is absent', async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new ExpensesService(mockAxios as never);

      await expect(service.createOrUpdateExpense(makeExpenseData())).rejects.toThrow(
        "Fout bij aanmaken kosten",
      );
    });

    it('rethrows a Dutch "bijwerken" fallback message when _id is present', async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new ExpensesService(mockAxios as never);

      await expect(
        service.createOrUpdateExpense(makeExpenseData({ _id: "e1" })),
      ).rejects.toThrow("Fout bij bijwerken kosten");
    });
  });

  describe("deleteExpense", () => {
    it("calls DELETE on the expense endpoint", async () => {
      mockAxios.delete.mockResolvedValue({});
      const service = new ExpensesService(mockAxios as never);

      const result = await service.deleteExpense("e1");

      expect(mockAxios.delete).toHaveBeenCalledWith("/expense/e1");
      expect(result).toEqual({ success: true });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new ExpensesService(mockAxios as never);

      await expect(service.deleteExpense("e1")).rejects.toThrow("Fout bij verwijderen kosten");
    });
  });
});
