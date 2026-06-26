import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ExpenseEdit from "@/app/expenses/edit/[id]";
import { useExpenseById, useCreateOrUpdateExpense } from "@/hooks/useExpenses";
import { useContactsList } from "@/hooks/useContacts";
import { useScan } from "@/hooks/scan/useScan";
import documentsService from "@/api/services/documentsService";
import type { Expense, ExpenseDetailResponse } from "@/api/types/expenses";
import type { ContactsResponse } from "@/api/types/contacts";

// Same fix the placeholder tab needed: automocking useScan still loads the
// real module once to infer its shape, which transitively imports
// react-native-document-scanner-plugin - that plugin throws via
// TurboModuleRegistry.getEnforcing() outside a native runtime unless it's
// mocked first.
jest.mock("react-native-document-scanner-plugin", () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));
jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useExpenses");
jest.mock("@/hooks/useContacts");
jest.mock("@/hooks/scan/useScan");
jest.mock("@/api/services/documentsService", () => ({
  __esModule: true,
  default: { uploadReceiptDocument: jest.fn() },
}));

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    _id: "e42",
    state: "active",
    contactId: "c1",
    contactName: "Acme",
    expenseNumber: 7,
    expenseDate: "2026-01-10",
    info: "Lunch",
    tax: 21,
    taxLow: 9,
    price: 100,
    createdAt: "2026-01-10",
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

function mockContactsList(overrides: Partial<ReturnType<typeof useContactsList>>) {
  (useContactsList as jest.Mock).mockReturnValue({
    data: undefined,
    isError: false,
    ...overrides,
  });
}

function mockScan(overrides: Partial<ReturnType<typeof useScan>> = {}) {
  (useScan as jest.Mock).mockReturnValue({
    scan: jest.fn(),
    isScanning: false,
    scanError: null,
    ...overrides,
  });
}

const mutate = jest.fn();

describe("Expense Edit/Create screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useCreateOrUpdateExpense as jest.Mock).mockReturnValue({ mutate, isPending: false });
    mockContactsList({});
    mockScan();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockExpenseById({});
    });

    it("starts with an empty form", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      expect(getByTestId("expense-info-input").props.value).toBe("");
      expect(getByTestId("expense-price-input").props.value).toBe("0");
    });

    it("saves without an _id", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      fireEvent.press(getByTestId("expense-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.not.objectContaining({ _id: expect.anything() }),
        expect.anything(),
      );
    });
  });

  describe("edit mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "e42" });
      const response: ExpenseDetailResponse = { success: true, data: makeExpense() };
      mockExpenseById({ data: response });
    });

    it("pre-fills the form from the fetched expense", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      expect(getByTestId("expense-info-input").props.value).toBe("Lunch");
      expect(getByTestId("expense-price-input").props.value).toBe("100");
      expect(getByTestId("expense-tax-input").props.value).toBe("21");
      expect(getByTestId("expense-taxlow-input").props.value).toBe("9");
    });

    it("saves with the expense's _id", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      fireEvent.press(getByTestId("expense-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "e42" }),
        expect.anything(),
      );
    });

    it("preserves the existing expenseFile when no new scan happened", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      fireEvent.press(getByTestId("expense-save-button"));

      expect(documentsService.uploadReceiptDocument).not.toHaveBeenCalled();
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ expenseFile: undefined }),
        expect.anything(),
      );
    });
  });

  describe("contact picker", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockExpenseById({});
      const response: ContactsResponse = {
        success: true,
        data: { docs: [{ _id: "c1", companyName: "Acme" }] },
      };
      mockContactsList({ data: response });
    });

    it("populates the dropdown from useContactsList and sets contactId/contactName on select", () => {
      const { getByTestId, getByText } = render(<ExpenseEdit />);

      fireEvent.press(getByTestId("contact-dropdown"));
      fireEvent.press(getByText("Acme"));
      fireEvent.press(getByTestId("expense-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: "c1", contactName: "Acme" }),
        expect.anything(),
      );
    });

    it("shows an inline Dutch error near the picker without blocking the rest of the form", () => {
      mockContactsList({ isError: true });

      const { getByText, getByTestId } = render(<ExpenseEdit />);

      expect(getByText("Fout bij het laden van contacten")).toBeTruthy();
      expect(getByTestId("expense-info-input")).toBeTruthy();
    });
  });

  describe("scan flow", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockExpenseById({});
    });

    it("pre-fills expenseDate/price/tax/taxLow from the scan result", async () => {
      const scan = jest.fn().mockResolvedValue({
        imageUri: "file:///tmp/bon.jpg",
        receiptInfo: { date: new Date("2026-01-20"), total: 50, taxLow: 0, taxHigh: 8.68 },
      });
      mockScan({ scan });

      const { getByTestId } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("scan-button"));

      await waitFor(() => expect(getByTestId("expense-price-input").props.value).toBe("50"));
      expect(getByTestId("expense-tax-input").props.value).toBe("8.68");
      expect(getByTestId("expense-taxlow-input").props.value).toBe("0");
      expect(getByTestId("expense-date-input").props.value).toBe("2026-01-20");
    });

    it("uploads the scanned image on save and uses the returned path as expenseFile", async () => {
      const scan = jest.fn().mockResolvedValue({
        imageUri: "file:///tmp/bon.jpg",
        receiptInfo: { date: new Date("2026-01-20"), total: 50, taxLow: 0, taxHigh: 8.68 },
      });
      mockScan({ scan });
      (documentsService.uploadReceiptDocument as jest.Mock).mockResolvedValue(
        "receipts/uploaded.jpg",
      );

      const { getByTestId } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("scan-button"));
      await waitFor(() => expect(getByTestId("expense-price-input").props.value).toBe("50"));

      fireEvent.press(getByTestId("expense-save-button"));

      await waitFor(() =>
        expect(documentsService.uploadReceiptDocument).toHaveBeenCalledWith({
          uri: "file:///tmp/bon.jpg",
          name: expect.any(String),
          type: "image/jpeg",
        }),
      );
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ expenseFile: "receipts/uploaded.jpg" }),
        expect.anything(),
      );
    });
  });
});
