import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useExpensesList,
  useExpenseById,
  useCreateOrUpdateExpense,
  useDeleteExpense,
} from "@/hooks/useExpenses";
import expensesService from "@/api/services/expensesService";
import QueryKeys from "@/api/queryKeys";
import type { ExpensesResponse, ExpenseDetailResponse } from "@/api/types/expenses";

jest.mock("@/api/services/expensesService", () => ({
  __esModule: true,
  default: {
    getExpenses: jest.fn(),
    getExpenseById: jest.fn(),
    createOrUpdateExpense: jest.fn(),
    deleteExpense: jest.fn(),
  },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makeExpense = () => ({
  _id: "e1",
  state: "active",
  contactId: "c1",
  contactName: "Acme",
  expenseNumber: 1,
  expenseDate: "2026-01-01",
  info: "Bon",
  tax: 21,
  taxLow: 0,
  price: 100,
  createdAt: "2026-01-01",
  tenantId: "t1",
  priceWOTaxes: 0,
});

const makeListResponse = (): ExpensesResponse => ({
  success: true,
  data: {
    docs: [makeExpense()],
    totalDocs: 1,
    offset: 0,
    limit: 10,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  },
});

const makeDetailResponse = (): ExpenseDetailResponse => ({
  success: true,
  data: makeExpense(),
});

describe("useExpensesList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves and calls the service with the given params", async () => {
    const response = makeListResponse();
    (expensesService.getExpenses as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useExpensesList({ offset: 0, limit: 10 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(response);
    expect(expensesService.getExpenses).toHaveBeenCalledWith({ offset: 0, limit: 10 });
  });

  it("exposes isLoading=true before the service resolves", () => {
    (expensesService.getExpenses as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useExpensesList({ offset: 0, limit: 10 }));

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (expensesService.getExpenses as jest.Mock).mockRejectedValue(new Error("network error"));

    const { result } = renderWithClient(() => useExpensesList({ offset: 0, limit: 10 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("uses QueryKeys.expenses.list(params) as the real runtime query key", async () => {
    const response = makeListResponse();
    (expensesService.getExpenses as jest.Mock).mockResolvedValue(response);
    const params = { offset: 0, limit: 10 };

    const { result, client } = renderWithClient(() => useExpensesList(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.expenses.list(params));
  });
});

describe("useExpenseById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not call the service when id is undefined", () => {
    const { result } = renderWithClient(() => useExpenseById(undefined));

    expect(result.current.fetchStatus).toBe("idle");
    expect(expensesService.getExpenseById).not.toHaveBeenCalled();
  });

  it('does not call the service when id is "create"', () => {
    const { result } = renderWithClient(() => useExpenseById("create"));

    expect(result.current.fetchStatus).toBe("idle");
    expect(expensesService.getExpenseById).not.toHaveBeenCalled();
  });

  it("fetches the expense detail for a real id", async () => {
    const response = makeDetailResponse();
    (expensesService.getExpenseById as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useExpenseById("e1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(expensesService.getExpenseById).toHaveBeenCalledWith("e1");
  });
});

describe("useCreateOrUpdateExpense", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the mutation's input on mutate", async () => {
    const response = makeDetailResponse();
    (expensesService.createOrUpdateExpense as jest.Mock).mockResolvedValue(response);
    const data = {
      contactId: "c1",
      contactName: "Acme",
      expenseNumber: 1,
      expenseDate: "2026-01-01",
      info: "Bon",
      tax: 21,
      taxLow: 0,
      price: 100,
      priceWOTaxes: 0,
    };

    const { result } = renderWithClient(() => useCreateOrUpdateExpense());

    act(() => {
      result.current.mutate(data);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(expensesService.createOrUpdateExpense).toHaveBeenCalledWith(data);
  });

  it("invalidates QueryKeys.expenses.base on success", async () => {
    const response = makeDetailResponse();
    (expensesService.createOrUpdateExpense as jest.Mock).mockResolvedValue(response);
    const data = {
      contactId: "c1",
      contactName: "Acme",
      expenseNumber: 1,
      expenseDate: "2026-01-01",
      info: "Bon",
      tax: 21,
      taxLow: 0,
      price: 100,
      priceWOTaxes: 0,
    };

    const { result, client } = renderWithClient(() => useCreateOrUpdateExpense());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate(data);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.expenses.base });
  });
});

describe("useDeleteExpense", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the id on mutate", async () => {
    (expensesService.deleteExpense as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderWithClient(() => useDeleteExpense());

    act(() => {
      result.current.mutate("e1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(expensesService.deleteExpense).toHaveBeenCalledWith("e1");
  });

  it("invalidates QueryKeys.expenses.base on success", async () => {
    (expensesService.deleteExpense as jest.Mock).mockResolvedValue({ success: true });

    const { result, client } = renderWithClient(() => useDeleteExpense());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("e1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.expenses.base });
  });
});
