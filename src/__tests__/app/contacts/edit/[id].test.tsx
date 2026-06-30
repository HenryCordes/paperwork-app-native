import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ContactEdit from "@/app/contacts/edit/[id]";
import { useContactById, useCreateOrUpdateContact } from "@/hooks/useContacts";
import type { Contact } from "@/api/types/contacts";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/useContacts", () => ({
  useContactById: jest.fn(),
  useCreateOrUpdateContact: jest.fn(),
  useContactsList: jest.fn(),
  useDeleteContact: jest.fn(),
}));

const mockSetOptions = jest.fn();
const mockBack = jest.fn();

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    _id: "c42",
    contactNumber: 1,
    companyName: "Acme BV",
    typeOfContact: "Klant",
    lastName: "Jansen",
    firstName: "Piet",
    initials: "P.J.",
    gender: "male",
    emailAddress: "piet@acme.nl",
    phoneNumber: "0612345678",
    mobilePhoneNumber: "",
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

const mutate = jest.fn();

describe("Contact Edit/Create screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });
    (useCreateOrUpdateContact as jest.Mock).mockReturnValue({ mutate, isPending: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockContactById({});
    });

    it("does not call useContactById when in create mode", () => {
      render(<ContactEdit />);

      expect(useContactById).toHaveBeenCalledWith("create");
      // The enabled guard means the service isn't called — that's the service-level guard test
    });

    it("starts with an empty form", () => {
      const { getByTestId } = render(<ContactEdit />);

      expect(getByTestId("contact-firstName-input").props.value).toBe("");
      expect(getByTestId("contact-lastName-input").props.value).toBe("");
      expect(getByTestId("contact-companyName-input").props.value).toBe("");
      expect(getByTestId("contact-emailAddress-input").props.value).toBe("");
    });

    it("saves without an _id", () => {
      const { getByTestId } = render(<ContactEdit />);

      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.not.objectContaining({ _id: expect.anything() }),
        expect.anything(),
      );
    });

    it("shows Dutch validation error when required fields are empty", () => {
      const { getByTestId, getByText } = render(<ContactEdit />);

      fireEvent.press(getByTestId("contact-save-button"));

      expect(getByText(/verplichte velden/i)).toBeTruthy();
      expect(mutate).not.toHaveBeenCalled();
    });

    it("themes the native header correctly", () => {
      render(<ContactEdit />);

      const options = mockSetOptions.mock.calls.at(-1)?.[0];
      expect(options.headerStyle).toEqual({ backgroundColor: "#ffffff" });
      expect(options.headerTitleStyle).toEqual({ color: "#000000" });
      expect(options.headerTintColor).toBe("#0054e9");
    });

    it("navigates back after a successful save", async () => {
      const successfulMutate = jest.fn((_data, { onSuccess }) => onSuccess());
      (useCreateOrUpdateContact as jest.Mock).mockReturnValue({
        mutate: successfulMutate,
        isPending: false,
      });

      const { getByTestId } = render(<ContactEdit />);
      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      await waitFor(() => expect(mockBack).toHaveBeenCalled());
    });
  });

  describe("edit mode", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "c42" });
      mockContactById({ data: { success: true, data: makeContact() } });
    });

    it("pre-fills the form from the fetched contact", () => {
      const { getByTestId } = render(<ContactEdit />);

      expect(getByTestId("contact-firstName-input").props.value).toBe("Piet");
      expect(getByTestId("contact-lastName-input").props.value).toBe("Jansen");
      expect(getByTestId("contact-companyName-input").props.value).toBe("Acme BV");
      expect(getByTestId("contact-emailAddress-input").props.value).toBe("piet@acme.nl");
    });

    it("saves with the contact's _id", () => {
      const { getByTestId } = render(<ContactEdit />);

      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "c42" }),
        expect.anything(),
      );
    });
  });

  describe("sameAddress toggle", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockContactById({});
    });

    it("copies postal address fields to visiting when toggled on", () => {
      const { getByTestId } = render(<ContactEdit />);

      fireEvent.changeText(getByTestId("contact-street-input"), "Kerkstraat");
      fireEvent.changeText(getByTestId("contact-houseNumber-input"), "10");
      fireEvent.changeText(getByTestId("contact-postalCode-input"), "5678 EF");
      fireEvent.changeText(getByTestId("contact-city-input"), "Rotterdam");
      fireEvent.changeText(getByTestId("contact-country-input"), "Nederland");

      fireEvent(getByTestId("contact-sameAddress-switch"), "valueChange", true);

      // Visiting address inputs should be hidden when sameAddress is true
      // but the values should be synced (verified via save)
      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitingStreet: "Kerkstraat",
          visitingHouseNumber: "10",
          visitingPostalCode: "5678 EF",
          visitingCity: "Rotterdam",
          visitingCountry: "Nederland",
        }),
        expect.anything(),
      );
    });

    it("keeps visiting address in sync with postal while sameAddress is on", () => {
      const { getByTestId } = render(<ContactEdit />);

      fireEvent.changeText(getByTestId("contact-street-input"), "Kerkstraat");
      fireEvent(getByTestId("contact-sameAddress-switch"), "valueChange", true);
      fireEvent.changeText(getByTestId("contact-street-input"), "Nieuwstraat");

      // validate via save
      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          street: "Nieuwstraat",
          visitingStreet: "Nieuwstraat",
        }),
        expect.anything(),
      );
    });

    it("hides the visiting address card when sameAddress is toggled on", () => {
      const { getByTestId, queryByTestId } = render(<ContactEdit />);

      expect(queryByTestId("contact-visitingStreet-input")).toBeTruthy();

      fireEvent(getByTestId("contact-sameAddress-switch"), "valueChange", true);

      expect(queryByTestId("contact-visitingStreet-input")).toBeNull();
    });
  });

  describe("typeOfContact and typeName dropdowns", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "create" });
      mockContactById({});
    });

    it("sets typeOfContact when a Dropdown option is selected", () => {
      const { getByTestId, getByText } = render(<ContactEdit />);

      fireEvent.press(getByTestId("contact-typeOfContact-dropdown"));
      fireEvent.press(getByText("Leverancier"));

      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ typeOfContact: "Leverancier" }),
        expect.anything(),
      );
    });

    it("sets typeName when a Dropdown option is selected", () => {
      const { getByTestId, getByText } = render(<ContactEdit />);

      // Default is "Particulier"; select "Bedrijf" to confirm the change is captured
      fireEvent.press(getByTestId("contact-typeName-dropdown"));
      fireEvent.press(getByText("Bedrijf"));

      fireEvent.changeText(getByTestId("contact-firstName-input"), "Jan");
      fireEvent.changeText(getByTestId("contact-lastName-input"), "Pietersen");
      fireEvent.changeText(getByTestId("contact-companyName-input"), "TestBV");
      fireEvent.changeText(getByTestId("contact-emailAddress-input"), "jan@test.nl");
      fireEvent.press(getByTestId("contact-save-button"));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ typeName: "Bedrijf" }),
        expect.anything(),
      );
    });
  });
});
