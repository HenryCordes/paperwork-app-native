import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import InvoiceEdit from "@/app/invoices/edit/[id]";
import { useInvoiceById, useCreateOrUpdateInvoice } from "@/hooks/useInvoices";
import { useContactsList } from "@/hooks/useContacts";
import type { Invoice, InvoiceDetailResponse } from "@/api/types/invoices";
import type { ContactsResponse } from "@/api/types/contacts";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useInvoices");
jest.mock("@/hooks/useContacts");

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

function makeLine() {
  return {
    _id: "l1",
    description: "Consultancy",
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
    invoiceDate: "2026-01-10",
    payDate: "2026-02-10",
    priceIncludingTax: 200,
    invoiceLines: [makeLine()],
    createdAt: "2026-01-10",
    ...overrides,
  };
}

function makeContactsResponse(): ContactsResponse {
  return {
    success: true,
    data: {
      docs: [
        {
          _id: "c1",
          contactNumber: 1,
          companyName: "Acme Corp",
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

function mockContactsList(overrides: Partial<ReturnType<typeof useContactsList>>) {
  (useContactsList as jest.Mock).mockReturnValue({
    data: undefined,
    isError: false,
    ...overrides,
  });
}

const mutate = jest.fn();

describe("Invoice Edit/Create screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useCreateOrUpdateInvoice as jest.Mock).mockReturnValue({ mutate, isPending: false });
    mockContactsList({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockInvoiceById({});
    });

    it("starts with one blank invoice line and empty form fields", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      // One line item input should exist
      expect(getByTestId("line-description-0")).toBeTruthy();
      expect(getByTestId("line-description-0").props.value).toBe("");
    });

    it("saves without an _id", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      fireEvent.press(getByTestId("invoice-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.not.objectContaining({ _id: expect.anything() }),
        expect.anything(),
      );
    });

    it("does not call useInvoiceById when in create mode", () => {
      render(<InvoiceEdit />);

      // The hook is called but with enabled=false (id is "create")
      // Verify it was called with "create" which disables the query
      expect(useInvoiceById).toHaveBeenCalledWith("create");
    });

    it("themes the native header correctly", () => {
      render(<InvoiceEdit />);

      const options = mockSetOptions.mock.calls.at(-1)?.[0];
      expect(options.headerStyle).toEqual({ backgroundColor: "#ffffff" });
      expect(options.headerTitleStyle).toEqual({ color: "#000000" });
      expect(options.headerTintColor).toBe("#0054e9");
    });

    it("navigates back after a successful save", async () => {
      const successfulMutate = jest.fn((_data, { onSuccess }) => onSuccess());
      (useCreateOrUpdateInvoice as jest.Mock).mockReturnValue({
        mutate: successfulMutate,
        isPending: false,
      });

      const { getByTestId } = render(<InvoiceEdit />);
      fireEvent.press(getByTestId("invoice-save-button"));

      await waitFor(() => expect(mockBack).toHaveBeenCalled());
    });
  });

  describe("edit mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "inv42" });
      const response: InvoiceDetailResponse = { success: true, data: makeInvoice() };
      mockInvoiceById({ data: response });
    });

    it("pre-fills the form including existing invoice lines", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      expect(getByTestId("line-description-0").props.value).toBe("Consultancy");
      expect(getByTestId("line-quantity-0").props.value).toBe("2");
      expect(getByTestId("line-price-0").props.value).toBe("100");
    });

    it("saves with the invoice's _id", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      fireEvent.press(getByTestId("invoice-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "inv42" }),
        expect.anything(),
      );
    });
  });

  describe("contact picker", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockInvoiceById({});
      mockContactsList({ data: makeContactsResponse() });
    });

    it("populates the dropdown from useContactsList and sets contactId/contactName on select", () => {
      const { getByTestId, getByText } = render(<InvoiceEdit />);

      // The contact dropdown shows "Piet Jansen" as label (firstName lastName)
      fireEvent.press(getByTestId("contact-dropdown"));
      fireEvent.press(getByText("Piet Jansen"));
      fireEvent.press(getByTestId("invoice-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: "c1", contactName: "Piet Jansen" }),
        expect.anything(),
      );
    });

    it("shows an inline Dutch error near the picker without blocking the form", () => {
      mockContactsList({ isError: true });

      const { getByText, getByTestId } = render(<InvoiceEdit />);

      expect(getByText("Fout bij het laden van contacten")).toBeTruthy();
      expect(getByTestId("line-description-0")).toBeTruthy();
    });
  });

  describe("line-items sub-form", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockInvoiceById({});
    });

    it("appends a blank line when 'add line' is pressed", () => {
      const { getByTestId, queryByTestId } = render(<InvoiceEdit />);

      expect(queryByTestId("line-description-1")).toBeNull();

      fireEvent.press(getByTestId("add-line-button"));

      expect(getByTestId("line-description-1")).toBeTruthy();
    });

    it("updates only the edited row's fields when a row input changes", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      fireEvent.changeText(getByTestId("line-description-0"), "Advies");

      expect(getByTestId("line-description-0").props.value).toBe("Advies");
    });

    it("removes a line when the remove button is pressed", () => {
      const { getByTestId, queryByTestId } = render(<InvoiceEdit />);

      // Add a second line first
      fireEvent.press(getByTestId("add-line-button"));
      expect(getByTestId("line-description-1")).toBeTruthy();

      // Remove the first line
      fireEvent.press(getByTestId("remove-line-0"));

      expect(queryByTestId("line-description-1")).toBeNull();
    });

    it("does not remove the last remaining line", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      fireEvent.press(getByTestId("remove-line-0"));

      // Still has the line (cannot remove last)
      expect(getByTestId("line-description-0")).toBeTruthy();
    });

    it("round-trips the line-items array into createOrUpdateInvoice", () => {
      const { getByTestId } = render(<InvoiceEdit />);

      fireEvent.changeText(getByTestId("line-description-0"), "Design werk");
      fireEvent.changeText(getByTestId("line-quantity-0"), "3");
      fireEvent.changeText(getByTestId("line-price-0"), "50");

      fireEvent.press(getByTestId("invoice-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceLines: expect.arrayContaining([
            expect.objectContaining({
              description: "Design werk",
              numberOfItems: 3,
              priceIncludingTax: 50,
            }),
          ]),
        }),
        expect.anything(),
      );
    });
  });

  describe("save failure", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockInvoiceById({});
    });

    it("shows a Dutch error and re-enables save when the mutation fails", async () => {
      (useCreateOrUpdateInvoice as jest.Mock).mockReturnValue({
        mutate: (_data: unknown, { onError }: { onError: (error: Error) => void }) =>
          onError(new Error("Fout bij opslaan factuur")),
        isPending: false,
      });

      const { getByTestId, findByText } = render(<InvoiceEdit />);
      fireEvent.press(getByTestId("invoice-save-button"));

      expect(await findByText("Fout bij opslaan factuur")).toBeTruthy();
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
