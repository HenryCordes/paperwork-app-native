import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ContactDetails from "@/app/contacts/[id]";
import { useContactById, useDeleteContact } from "@/hooks/useContacts";
import type { Contact } from "@/api/types/contacts";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useContacts", () => ({
  useContactById: jest.fn(),
  useDeleteContact: jest.fn(),
  useContactsList: jest.fn(),
  useCreateOrUpdateContact: jest.fn(),
}));
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    _id: "c42",
    contactNumber: 1,
    companyName: "Acme BV",
    typeOfContact: "Klant",
    lastName: "Jansen",
    firstName: "Piet",
    initials: "P",
    emailAddress: "piet@acme.nl",
    phoneNumber: "0612345678",
    mobilePhoneNumber: "0687654321",
    street: "Hoofdstraat",
    houseNumber: "1",
    postalCode: "1234 AB",
    city: "Amsterdam",
    country: "Nederland",
    visitingStreet: "Bijstraat",
    visitingHouseNumber: "2",
    visitingPostalCode: "1234 CD",
    visitingCity: "Utrecht",
    visitingCountry: "Nederland",
    bankIBAN: "NL91ABNA0417164300",
    bankPersonName: "P. Jansen",
    channel: "",
    history: "",
    typeName: "Bedrijf",
    owner: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "",
    id: "c42",
    ...overrides,
  };
}

function mockContactById(overrides: Partial<ReturnType<typeof useContactById>>) {
  (useContactById as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

function mockDeleteContact(mutate: jest.Mock = jest.fn()) {
  (useDeleteContact as jest.Mock).mockReturnValue({ mutate });
}

function renderHeaderRight() {
  const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
  return render(headerRight());
}

describe("Contact Details screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "c42" });
    mockDeleteContact();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the contact's grouped fields once loaded", () => {
    const response = { success: true, data: makeContact() };
    mockContactById({ data: response });

    const { getByText } = render(<ContactDetails />);

    expect(getByText("Acme BV")).toBeTruthy();
    expect(getByText("Klant")).toBeTruthy();
    expect(getByText("Bedrijf")).toBeTruthy();
    expect(getByText("Piet Jansen")).toBeTruthy();
    expect(getByText("piet@acme.nl")).toBeTruthy();
    expect(getByText("0612345678")).toBeTruthy();
    expect(getByText("NL91ABNA0417164300")).toBeTruthy();
  });

  it("shows a loading state while the query is pending", () => {
    mockContactById({ isLoading: true });

    const { queryByText } = render(<ContactDetails />);

    expect(queryByText("Acme BV")).toBeNull();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockContactById({ isError: true, error: new Error("network down") });

    const { getByText } = render(<ContactDetails />);

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("navigates to the edit screen when the edit action is pressed", () => {
    mockContactById({ data: { success: true, data: makeContact() } });
    render(<ContactDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Bewerken"));

    expect(mockPush).toHaveBeenCalledWith("/contacts/edit/c42");
  });

  it("confirms before deleting, then calls mutate and navigates back on success", () => {
    const mutate = jest.fn((id, { onSuccess }) => onSuccess());
    mockDeleteContact(mutate);
    mockContactById({ data: { success: true, data: makeContact() } });
    render(<ContactDetails />);

    const { getByLabelText } = renderHeaderRight();
    fireEvent.press(getByLabelText("Verwijderen"));

    expect(Alert.alert).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmButton = buttons.find((button: { text: string }) => button.text === "Verwijderen");
    confirmButton.onPress();

    expect(mutate).toHaveBeenCalledWith("c42", expect.anything());
    expect(mockBack).toHaveBeenCalled();
  });

  it("themes the native header for consistent look", () => {
    mockContactById({ data: { success: true, data: makeContact() } });

    render(<ContactDetails />);

    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    expect(options.headerStyle).toEqual({ backgroundColor: "#ffffff" });
    expect(options.headerTitleStyle).toEqual({ color: "#000000" });
    expect(options.headerTintColor).toBe("#0054e9");
  });

  it("renders postal address fields when present", () => {
    mockContactById({ data: { success: true, data: makeContact() } });

    const { getByText } = render(<ContactDetails />);

    expect(getByText("Postadres")).toBeTruthy();
    expect(getByText(/Hoofdstraat 1/)).toBeTruthy();
    expect(getByText(/1234 AB Amsterdam/)).toBeTruthy();
  });

  it("renders visiting address when different from postal", () => {
    mockContactById({ data: { success: true, data: makeContact() } });

    const { getByText } = render(<ContactDetails />);

    expect(getByText("Bezoekadres")).toBeTruthy();
    expect(getByText(/Bijstraat 2/)).toBeTruthy();
  });

  it("renders bank details when IBAN is present", () => {
    mockContactById({ data: { success: true, data: makeContact() } });

    const { getByText } = render(<ContactDetails />);

    expect(getByText("Bankgegevens")).toBeTruthy();
    expect(getByText("NL91ABNA0417164300")).toBeTruthy();
    expect(getByText("P. Jansen")).toBeTruthy();
  });
});
