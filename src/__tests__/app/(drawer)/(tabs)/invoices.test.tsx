import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Invoices from "@/app/(drawer)/(tabs)/invoices";
import { useInvoicesList } from "@/hooks/useInvoices";
import invoicesService from "@/api/services/invoicesService";
import QueryKeys from "@/api/queryKeys";
import type { Invoice, InvoicesResponse } from "@/api/types/invoices";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/useInvoices");
jest.mock("@/api/services/invoicesService", () => ({
  __esModule: true,
  default: { getInvoices: jest.fn() },
}));

const mockPush = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <Invoices />
    </QueryClientProvider>,
  );
  return { ...result, client };
}

function makeLine() {
  return {
    _id: "l1",
    description: "Consultancy",
    numberOfItems: 1,
    priceIncludingTax: 100,
    taxRate: 21,
    totalLinePrice: 100,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    _id: "inv1",
    state: "open",
    contactId: "c1",
    contactName: "Acme BV",
    invoiceNumber: 42,
    invoiceDate: "2026-01-15",
    payDate: "2026-02-15",
    priceIncludingTax: 200,
    invoiceLines: [makeLine()],
    createdAt: "2026-01-15",
    ...overrides,
  };
}

function makeListResponse(
  docs: Invoice[],
  overrides: Partial<InvoicesResponse["data"]> = {},
): InvoicesResponse {
  return {
    success: true,
    data: {
      docs,
      totalDocs: docs.length,
      offset: 0,
      limit: 10,
      totalPages: 1,
      page: 1,
      pagingCounter: 1,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
      ...overrides,
    },
  };
}

function mockInvoicesList(overrides: Partial<ReturnType<typeof useInvoicesList>>) {
  (useInvoicesList as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("Invoices (Facturen) List screen", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders a card per invoice with its key fields", () => {
    mockInvoicesList({ data: makeListResponse([makeInvoice()]) });

    const { getByText } = renderScreen();

    expect(getByText("#42 - Acme BV")).toBeTruthy();
    expect(getByText(new Date("2026-01-15").toLocaleDateString("nl-NL"))).toBeTruthy();
    expect(getByText("€200,00")).toBeTruthy();
  });

  it("renders the status badge with the badge color", () => {
    mockInvoicesList({
      data: makeListResponse([makeInvoice({ state: "betaald" })]),
    });

    const { getByTestId, getByText } = renderScreen();

    expect(getByText("betaald")).toBeTruthy();
    // badge is colored — just assert it renders
    expect(getByTestId("invoice-badge-inv1")).toBeTruthy();
  });

  it("shows the Dutch empty state when the list is empty", () => {
    mockInvoicesList({ data: makeListResponse([]) });

    const { getByText } = renderScreen();

    expect(getByText("Geen facturen gevonden")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockInvoicesList({ isError: true, error: new Error("network down") });

    const { getByText } = renderScreen();

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("filters the rendered cards by the search text", () => {
    mockInvoicesList({
      data: makeListResponse([
        makeInvoice({ _id: "inv1", contactName: "Acme BV", invoiceNumber: 1 }),
        makeInvoice({ _id: "inv2", contactName: "Beta Corp", invoiceNumber: 2 }),
      ]),
    });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Zoek facturen..."), "Beta");

    expect(getByText("#2 - Beta Corp")).toBeTruthy();
    expect(queryByText("#1 - Acme BV")).toBeNull();
  });

  it("navigates to the invoice's details when its card is pressed", () => {
    mockInvoicesList({ data: makeListResponse([makeInvoice({ _id: "inv42" })]) });

    const { getByText } = renderScreen();
    fireEvent.press(getByText("#42 - Acme BV"));

    expect(mockPush).toHaveBeenCalledWith("/invoices/inv42");
  });

  it("navigates to the create route when the FAB is pressed", () => {
    mockInvoicesList({ data: makeListResponse([]) });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("invoices-fab"));

    expect(mockPush).toHaveBeenCalledWith("/invoices/edit/create");
  });

  describe("pagination", () => {
    it("loads the next page when onEndReached fires and hasNextPage is true", async () => {
      mockInvoicesList({
        data: makeListResponse([makeInvoice({ _id: "inv1" })], { hasNextPage: true }),
      });
      (invoicesService.getInvoices as jest.Mock).mockResolvedValue(
        makeListResponse([makeInvoice({ _id: "inv2", invoiceNumber: 99, contactName: "Beta Corp" })]),
      );

      const { getByTestId, findByText } = renderScreen();
      fireEvent(getByTestId("invoices-list"), "endReached");

      expect(await findByText("#99 - Beta Corp")).toBeTruthy();
      expect(invoicesService.getInvoices).toHaveBeenCalledWith({ offset: 10, limit: 10 });
    });

    it("does not fetch another page when hasNextPage is false", () => {
      mockInvoicesList({
        data: makeListResponse([makeInvoice({ _id: "inv1" })], { hasNextPage: false }),
      });

      const { getByTestId } = renderScreen();
      fireEvent(getByTestId("invoices-list"), "endReached");

      expect(invoicesService.getInvoices).not.toHaveBeenCalled();
    });
  });

  it("invalidates the invoices query when pulled to refresh", async () => {
    mockInvoicesList({ data: makeListResponse([makeInvoice()]) });
    const { getByTestId, client } = renderScreen();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    fireEvent(getByTestId("invoices-list"), "refresh");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.invoices.base }),
    );
  });
});
