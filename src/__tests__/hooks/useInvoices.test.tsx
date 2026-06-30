import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useInvoicesList,
  useInvoiceById,
  useCreateOrUpdateInvoice,
  useDeleteInvoice,
} from "@/hooks/useInvoices";
import invoicesService from "@/api/services/invoicesService";
import QueryKeys from "@/api/queryKeys";
import type { InvoicesResponse, InvoiceDetailResponse } from "@/api/types/invoices";

jest.mock("@/api/services/invoicesService", () => ({
  __esModule: true,
  default: {
    getInvoices: jest.fn(),
    getInvoiceById: jest.fn(),
    createOrUpdateInvoice: jest.fn(),
    deleteInvoice: jest.fn(),
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

const makeLine = () => ({
  _id: "l1",
  description: "Consultancy",
  numberOfItems: 2,
  priceIncludingTax: 100,
  taxRate: 21,
  totalLinePrice: 200,
});

const makeInvoice = () => ({
  _id: "inv1",
  state: "open",
  contactId: "c1",
  contactName: "Acme BV",
  invoiceNumber: 42,
  invoiceDate: "2026-01-01",
  payDate: "2026-02-01",
  priceIncludingTax: 200,
  invoiceLines: [makeLine()],
  createdAt: "2026-01-01",
});

const makeListResponse = (): InvoicesResponse => ({
  success: true,
  data: {
    docs: [makeInvoice()],
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

const makeDetailResponse = (): InvoiceDetailResponse => ({
  success: true,
  data: makeInvoice(),
});

describe("useInvoicesList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves and calls the service with the given params", async () => {
    const response = makeListResponse();
    (invoicesService.getInvoices as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useInvoicesList({ offset: 0, limit: 10 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(response);
    expect(invoicesService.getInvoices).toHaveBeenCalledWith({ offset: 0, limit: 10 });
  });

  it("exposes isLoading=true before the service resolves", () => {
    (invoicesService.getInvoices as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useInvoicesList({ offset: 0, limit: 10 }));

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (invoicesService.getInvoices as jest.Mock).mockRejectedValue(new Error("network error"));

    const { result } = renderWithClient(() => useInvoicesList({ offset: 0, limit: 10 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("uses QueryKeys.invoices.list(params) as the real runtime query key", async () => {
    const response = makeListResponse();
    (invoicesService.getInvoices as jest.Mock).mockResolvedValue(response);
    const params = { offset: 0, limit: 10 };

    const { result, client } = renderWithClient(() => useInvoicesList(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.invoices.list(params));
  });
});

describe("useInvoiceById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not call the service when id is undefined", () => {
    const { result } = renderWithClient(() => useInvoiceById(undefined));

    expect(result.current.fetchStatus).toBe("idle");
    expect(invoicesService.getInvoiceById).not.toHaveBeenCalled();
  });

  it('does not call the service when id is "create"', () => {
    const { result } = renderWithClient(() => useInvoiceById("create"));

    expect(result.current.fetchStatus).toBe("idle");
    expect(invoicesService.getInvoiceById).not.toHaveBeenCalled();
  });

  it("fetches the invoice detail for a real id", async () => {
    const response = makeDetailResponse();
    (invoicesService.getInvoiceById as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useInvoiceById("inv1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(invoicesService.getInvoiceById).toHaveBeenCalledWith("inv1");
  });
});

describe("useCreateOrUpdateInvoice", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the mutation's input on mutate", async () => {
    const response = makeDetailResponse();
    (invoicesService.createOrUpdateInvoice as jest.Mock).mockResolvedValue(response);
    const data = {
      contactId: "c1",
      contactName: "Acme BV",
      invoiceNumber: 42,
      invoiceDate: "2026-01-01",
      priceIncludingTax: 200,
      invoiceLines: [makeLine()],
    };

    const { result } = renderWithClient(() => useCreateOrUpdateInvoice());

    act(() => {
      result.current.mutate(data);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoicesService.createOrUpdateInvoice).toHaveBeenCalledWith(data);
  });

  it("invalidates QueryKeys.invoices.base on success", async () => {
    const response = makeDetailResponse();
    (invoicesService.createOrUpdateInvoice as jest.Mock).mockResolvedValue(response);
    const data = {
      contactId: "c1",
      contactName: "Acme BV",
      invoiceNumber: 42,
      invoiceDate: "2026-01-01",
      priceIncludingTax: 200,
      invoiceLines: [makeLine()],
    };

    const { result, client } = renderWithClient(() => useCreateOrUpdateInvoice());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate(data);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.invoices.base });
  });
});

describe("useDeleteInvoice", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the id on mutate", async () => {
    (invoicesService.deleteInvoice as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderWithClient(() => useDeleteInvoice());

    act(() => {
      result.current.mutate("inv1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoicesService.deleteInvoice).toHaveBeenCalledWith("inv1");
  });

  it("invalidates QueryKeys.invoices.base on success", async () => {
    (invoicesService.deleteInvoice as jest.Mock).mockResolvedValue({ success: true });

    const { result, client } = renderWithClient(() => useDeleteInvoice());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("inv1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.invoices.base });
  });
});
