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

    it("themes the native header instead of leaving it on the stock light defaults", () => {
      render(<ExpenseEdit />);

      const options = mockSetOptions.mock.calls.at(-1)?.[0];
      expect(options.headerStyle).toEqual({ backgroundColor: "#ffffff" });
      expect(options.headerTitleStyle).toEqual({ color: "#000000" });
      expect(options.headerTintColor).toBe("#0054e9");
    });

    it("updates each field as the user types", () => {
      const { getByTestId } = render(<ExpenseEdit />);

      fireEvent.changeText(getByTestId("expense-info-input"), "Diner");
      fireEvent.changeText(getByTestId("expense-date-input"), "2026-02-01");
      fireEvent.changeText(getByTestId("expense-tax-input"), "5.5");
      fireEvent.changeText(getByTestId("expense-taxlow-input"), "1.5");
      fireEvent.changeText(getByTestId("expense-price-input"), "42");

      expect(getByTestId("expense-info-input").props.value).toBe("Diner");
      expect(getByTestId("expense-date-input").props.value).toBe("2026-02-01");
      expect(getByTestId("expense-tax-input").props.value).toBe("5.5");
      expect(getByTestId("expense-taxlow-input").props.value).toBe("1.5");
      expect(getByTestId("expense-price-input").props.value).toBe("42");
    });

    it("navigates back after a successful save", async () => {
      const successfulMutate = jest.fn((_data, { onSuccess }) => onSuccess());
      (useCreateOrUpdateExpense as jest.Mock).mockReturnValue({
        mutate: successfulMutate,
        isPending: false,
      });

      const { getByTestId } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("expense-save-button"));

      await waitFor(() => expect(mockBack).toHaveBeenCalled());
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
        data: {
          docs: [
            {
              _id: "c1",
              contactNumber: 1,
              companyName: "Acme",
              typeOfContact: "Bedrijf",
              lastName: "Jansen",
              firstName: "Piet",
              initials: "P",
              emailAddress: "piet@acme.nl",
              phoneNumber: "",
              mobilePhoneNumber: "",
              street: "",
              houseNumber: "",
              postalCode: "",
              city: "",
              country: "",
              visitingStreet: "",
              visitingHouseNumber: "",
              visitingPostalCode: "",
              visitingCity: "",
              visitingCountry: "",
              bankIBAN: "",
              bankPersonName: "",
              channel: "",
              history: "",
              typeName: "",
              owner: "",
              createdAt: "2026-01-01T00:00:00.000Z",
              tenantId: "",
              id: "c1",
            },
          ],
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

    it("leaves the form unchanged when the scan is cancelled", async () => {
      const scan = jest.fn().mockResolvedValue(null);
      mockScan({ scan });

      const { getByTestId } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("scan-button"));

      await waitFor(() => expect(scan).toHaveBeenCalled());
      expect(getByTestId("expense-price-input").props.value).toBe("0");
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

    it("shows a Dutch error and re-enables save when the upload fails", async () => {
      const scan = jest.fn().mockResolvedValue({
        imageUri: "file:///tmp/bon.jpg",
        receiptInfo: { date: new Date("2026-01-20"), total: 50, taxLow: 0, taxHigh: 8.68 },
      });
      mockScan({ scan });
      (documentsService.uploadReceiptDocument as jest.Mock).mockRejectedValue(
        new Error("network down"),
      );

      const { getByTestId, findByText } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("scan-button"));
      await waitFor(() => expect(getByTestId("expense-price-input").props.value).toBe("50"));

      fireEvent.press(getByTestId("expense-save-button"));

      expect(await findByText("network down")).toBeTruthy();
      expect(mutate).not.toHaveBeenCalled();
      expect(getByTestId("expense-save-button").props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe("save failure", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockExpenseById({});
    });

    it("shows a Dutch error and re-enables save when the mutation fails", async () => {
      (useCreateOrUpdateExpense as jest.Mock).mockReturnValue({
        mutate: (_data: unknown, { onError }: { onError: (error: Error) => void }) =>
          onError(new Error("Fout bij aanmaken kosten")),
        isPending: false,
      });

      const { getByTestId, findByText } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("expense-save-button"));

      expect(await findByText("Fout bij aanmaken kosten")).toBeTruthy();
      expect(mockBack).not.toHaveBeenCalled();
      expect(getByTestId("expense-save-button").props.accessibilityState?.disabled).toBeFalsy();
    });

    it("disables save for the duration of a slow upload, before the mutation is even called", async () => {
      let resolveUpload: (path: string) => void = () => {};
      (documentsService.uploadReceiptDocument as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      );
      mockScan({
        scan: jest.fn().mockResolvedValue({
          imageUri: "file:///tmp/bon.jpg",
          receiptInfo: { date: new Date("2026-01-20"), total: 50, taxLow: 0, taxHigh: 8.68 },
        }),
      });

      const { getByTestId } = render(<ExpenseEdit />);
      fireEvent.press(getByTestId("scan-button"));
      await waitFor(() => expect(getByTestId("expense-price-input").props.value).toBe("50"));

      fireEvent.press(getByTestId("expense-save-button"));
      expect(getByTestId("expense-save-button").props.accessibilityState?.disabled).toBeTruthy();

      fireEvent.press(getByTestId("expense-save-button"));
      expect(documentsService.uploadReceiptDocument).toHaveBeenCalledTimes(1);

      resolveUpload("receipts/uploaded.jpg");
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    });
  });
});
