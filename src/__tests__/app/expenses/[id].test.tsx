import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ExpenseDetails from "@/app/expenses/[id]";
import { useExpenseById, useDeleteExpense } from "@/hooks/useExpenses";
import type { Expense, ExpenseDetailResponse } from "@/api/types/expenses";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useExpenses");
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    _id: "e42",
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

function mockExpenseById(overrides: Partial<ReturnType<typeof useExpenseById>>) {
  (useExpenseById as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

function mockDeleteExpense(mutate: jest.Mock = jest.fn()) {
  (useDeleteExpense as jest.Mock).mockReturnValue({ mutate });
}

function renderHeaderRight() {
  const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
  return render(headerRight());
}

describe("Expense Details screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "e42" });
    mockDeleteExpense();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the expense's fields once loaded", () => {
    const response: ExpenseDetailResponse = { success: true, data: makeExpense() };
    mockExpenseById({ data: response });

    const { getByText } = render(<ExpenseDetails />);

    expect(getByText("#1 - Lunch")).toBeTruthy();
    expect(getByText("Acme")).toBeTruthy();
    expect(getByText(new Date("2026-01-15").toLocaleDateString("nl-NL"))).toBeTruthy();
    expect(getByText("€21,00")).toBeTruthy();
    expect(getByText("€9,00")).toBeTruthy();
    expect(getByText("€100,00")).toBeTruthy();
  });

  it("shows a loading state while the query is pending", () => {
    mockExpenseById({ isLoading: true });

    const { queryByText } = render(<ExpenseDetails />);

    expect(queryByText("Acme")).toBeNull();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockExpenseById({ isError: true, error: new Error("network down") });

    const { getByText } = render(<ExpenseDetails />);

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("navigates to the edit screen when the edit action is pressed", () => {
    mockExpenseById({ data: { success: true, data: makeExpense() } });
    render(<ExpenseDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Bewerken"));

    expect(mockPush).toHaveBeenCalledWith("/expenses/edit/e42");
  });

  it("confirms before deleting, then navigates back on success", () => {
    const mutate = jest.fn((id, { onSuccess }) => onSuccess());
    mockDeleteExpense(mutate);
    mockExpenseById({ data: { success: true, data: makeExpense() } });
    render(<ExpenseDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Verwijderen"));

    expect(Alert.alert).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmButton = buttons.find((button: { text: string }) => button.text === "Verwijderen");
    confirmButton.onPress();

    expect(mutate).toHaveBeenCalledWith("e42", expect.anything());
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows a "view receipt" action when expenseFile is present', () => {
    mockExpenseById({
      data: { success: true, data: makeExpense({ expenseFile: "receipts/abc.jpg" }) },
    });

    const { getByText } = render(<ExpenseDetails />);

    expect(getByText("Bon bekijken")).toBeTruthy();
  });

  it('does not show a "view receipt" action when expenseFile is absent', () => {
    mockExpenseById({ data: { success: true, data: makeExpense({ expenseFile: undefined }) } });

    const { queryByText } = render(<ExpenseDetails />);

    expect(queryByText("Bon bekijken")).toBeNull();
  });

  it("shows an inline Dutch error when opening the receipt fails", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    mockExpenseById({
      data: { success: true, data: makeExpense({ expenseFile: "receipts/abc.jpg" }) },
    });

    const { getByText, findByText } = render(<ExpenseDetails />);
    fireEvent.press(getByText("Bon bekijken"));

    expect(await findByText("Kan de bon niet openen")).toBeTruthy();
  });
});
