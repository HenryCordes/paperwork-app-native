import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Expenses from "@/app/(drawer)/(tabs)/expenses";
import { useExpensesList } from "@/hooks/useExpenses";
import expensesService from "@/api/services/expensesService";
import type { Expense, ExpensesResponse } from "@/api/types/expenses";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/useExpenses");
jest.mock("@/api/services/expensesService", () => ({
  __esModule: true,
  default: { getExpenses: jest.fn() },
}));

const mockPush = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <Expenses />
    </QueryClientProvider>,
  );
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    _id: "e1",
    state: "active",
    contactId: "c1",
    contactName: "Acme",
    expenseNumber: 1,
    expenseDate: "2026-01-15",
    info: "Lunch",
    tax: 21,
    taxLow: 9,
    price: 100,
    createdAt: "2026-01-15",
    tenantId: "t1",
    priceWOTaxes: 0,
    ...overrides,
  };
}

function makeListResponse(
  docs: Expense[],
  overrides: Partial<ExpensesResponse["data"]> = {},
): ExpensesResponse {
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

function mockExpensesList(overrides: Partial<ReturnType<typeof useExpensesList>>) {
  (useExpensesList as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("Expenses (Kosten) List screen", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders a card per expense with its key fields", () => {
    mockExpensesList({ data: makeListResponse([makeExpense()]) });

    const { getByText } = renderScreen();

    expect(getByText("#1 - Lunch")).toBeTruthy();
    expect(getByText("Acme")).toBeTruthy();
    expect(getByText(new Date("2026-01-15").toLocaleDateString("nl-NL"))).toBeTruthy();
    expect(getByText("€100,00")).toBeTruthy();
    expect(getByText("€21,00")).toBeTruthy();
    expect(getByText("€9,00")).toBeTruthy();
  });

  it("shows the Dutch empty state when the list is empty", () => {
    mockExpensesList({ data: makeListResponse([]) });

    const { getByText } = renderScreen();

    expect(getByText("Geen kosten gevonden")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockExpensesList({ isError: true, error: new Error("network down") });

    const { getByText } = renderScreen();

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("filters the rendered cards by the search text", () => {
    mockExpensesList({
      data: makeListResponse([
        makeExpense({ _id: "e1", info: "Lunch", contactName: "Acme" }),
        makeExpense({ _id: "e2", info: "Taxi", contactName: "Bravo" }),
      ]),
    });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Zoek kosten..."), "Bravo");

    expect(getByText("#1 - Taxi")).toBeTruthy();
    expect(queryByText("#1 - Lunch")).toBeNull();
  });

  it("navigates to the expense's details when its card is pressed", () => {
    mockExpensesList({ data: makeListResponse([makeExpense({ _id: "e42" })]) });

    const { getByText } = renderScreen();
    fireEvent.press(getByText("#1 - Lunch"));

    expect(mockPush).toHaveBeenCalledWith("/expenses/e42");
  });

  it("navigates to the create route when the FAB is pressed", () => {
    mockExpensesList({ data: makeListResponse([]) });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("expenses-fab"));

    expect(mockPush).toHaveBeenCalledWith("/expenses/edit/create");
  });

  describe("pagination", () => {
    it("loads the next page when onEndReached fires and hasNextPage is true", async () => {
      mockExpensesList({
        data: makeListResponse([makeExpense({ _id: "e1" })], { hasNextPage: true }),
      });
      (expensesService.getExpenses as jest.Mock).mockResolvedValue(
        makeListResponse([makeExpense({ _id: "e2", info: "Taxi" })]),
      );

      const { getByTestId, findByText } = renderScreen();
      fireEvent(getByTestId("expenses-list"), "endReached");

      expect(await findByText("#1 - Taxi")).toBeTruthy();
      expect(expensesService.getExpenses).toHaveBeenCalledWith({ offset: 10, limit: 10 });
    });

    it("does not fetch another page when hasNextPage is false", () => {
      mockExpensesList({
        data: makeListResponse([makeExpense({ _id: "e1" })], { hasNextPage: false }),
      });

      const { getByTestId } = renderScreen();
      fireEvent(getByTestId("expenses-list"), "endReached");

      expect(expensesService.getExpenses).not.toHaveBeenCalled();
    });

    it("does not start a second fetch for the same page while the first is still in flight", async () => {
      mockExpensesList({
        data: makeListResponse([makeExpense({ _id: "e1" })], { hasNextPage: true }),
      });
      let resolveFetch: (value: ExpensesResponse) => void = () => {};
      (expensesService.getExpenses as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { getByTestId } = renderScreen();
      fireEvent(getByTestId("expenses-list"), "endReached");
      fireEvent(getByTestId("expenses-list"), "endReached");

      expect(expensesService.getExpenses).toHaveBeenCalledTimes(1);

      resolveFetch(makeListResponse([makeExpense({ _id: "e2", info: "Taxi" })]));
      await waitFor(() => expect(expensesService.getExpenses).toHaveBeenCalledTimes(1));
    });
  });
});
