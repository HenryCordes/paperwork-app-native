import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import InvoiceDetails from "@/app/invoices/[id]";
import { useInvoiceById, useDeleteInvoice } from "@/hooks/useInvoices";
import type { Invoice, InvoiceDetailResponse } from "@/api/types/invoices";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useInvoices");
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

function makeLine() {
  return {
    _id: "l1",
    description: "Consultancy diensten",
    numberOfItems: 2,
    priceIncludingTax: 100,
    taxRate: 21,
    totalLinePrice: 200,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    _id: "inv42",
    state: "open",
    contactId: "c1",
    contactName: "Acme BV",
    invoiceNumber: 42,
    invoiceDate: "2026-01-15",
    payDate: "2026-02-15",
    priceIncludingTax: 200,
    tax: 34.71,
    taxLow: 0,
    invoiceLines: [makeLine()],
    createdAt: "2026-01-15",
    ...overrides,
  };
}

function mockInvoiceById(overrides: Partial<ReturnType<typeof useInvoiceById>>) {
  (useInvoiceById as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

function mockDeleteInvoice(mutate: jest.Mock = jest.fn()) {
  (useDeleteInvoice as jest.Mock).mockReturnValue({ mutate });
}

function renderHeaderRight() {
  const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
  return render(headerRight());
}

describe("Invoice Details screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "inv42" });
    mockDeleteInvoice();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the invoice's fields once loaded", () => {
    const response: InvoiceDetailResponse = { success: true, data: makeInvoice() };
    mockInvoiceById({ data: response });

    const { getByText, getAllByText } = render(<InvoiceDetails />);

    expect(getByText("#42 - Acme BV")).toBeTruthy();
    expect(getByText("Acme BV")).toBeTruthy();
    expect(getByText(new Date("2026-01-15").toLocaleDateString("nl-NL"))).toBeTruthy();
    expect(getAllByText("€200,00").length).toBeGreaterThan(0);
  });

  it("renders the invoice line items read-only", () => {
    const response: InvoiceDetailResponse = { success: true, data: makeInvoice() };
    mockInvoiceById({ data: response });

    const { getByText } = render(<InvoiceDetails />);

    expect(getByText("Consultancy diensten")).toBeTruthy();
    expect(getByText("2x")).toBeTruthy();
    expect(getByText("€100,00")).toBeTruthy();
  });

  it("renders the status badge", () => {
    const response: InvoiceDetailResponse = { success: true, data: makeInvoice({ state: "betaald" }) };
    mockInvoiceById({ data: response });

    const { getByTestId } = render(<InvoiceDetails />);

    expect(getByTestId("invoice-state-badge")).toBeTruthy();
  });

  it("shows a loading state while the query is pending", () => {
    mockInvoiceById({ isLoading: true });

    const { queryByText } = render(<InvoiceDetails />);

    expect(queryByText("Acme BV")).toBeNull();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockInvoiceById({ isError: true, error: new Error("network down") });

    const { getByText } = render(<InvoiceDetails />);

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("navigates to the edit screen when the edit action is pressed", () => {
    mockInvoiceById({ data: { success: true, data: makeInvoice() } });
    render(<InvoiceDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Bewerken"));

    expect(mockPush).toHaveBeenCalledWith("/invoices/edit/inv42");
  });

  it("confirms before deleting, then navigates back on success", () => {
    const mutate = jest.fn((_id, { onSuccess }) => onSuccess());
    mockDeleteInvoice(mutate);
    mockInvoiceById({ data: { success: true, data: makeInvoice() } });
    render(<InvoiceDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Verwijderen"));

    expect(Alert.alert).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmButton = buttons.find((button: { text: string }) => button.text === "Verwijderen");
    confirmButton.onPress();

    expect(mutate).toHaveBeenCalledWith("inv42", expect.anything());
    expect(mockBack).toHaveBeenCalled();
  });

  it("themes the native header correctly", () => {
    mockInvoiceById({ data: { success: true, data: makeInvoice() } });

    render(<InvoiceDetails />);

    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    expect(options.headerStyle).toEqual({ backgroundColor: "#ffffff" });
    expect(options.headerTitleStyle).toEqual({ color: "#000000" });
    expect(options.headerTintColor).toBe("#0054e9");
  });
});
