import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Contacts from "@/app/(drawer)/(tabs)/contacts";
import { useContactsList } from "@/hooks/useContacts";
import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import type { Contact, ContactsResponse } from "@/api/types/contacts";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/useContacts");
jest.mock("@/api/services/contactsService", () => ({
  __esModule: true,
  default: { getContacts: jest.fn() },
}));

const mockPush = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <Contacts />
    </QueryClientProvider>,
  );
  return { ...result, client };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    _id: "c1",
    contactNumber: 1,
    companyName: "Acme BV",
    typeOfContact: "Klant",
    lastName: "Jansen",
    firstName: "Piet",
    initials: "P",
    emailAddress: "piet@acme.nl",
    phoneNumber: "0612345678",
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
    typeName: "Bedrijf",
    owner: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    tenantId: "",
    id: "c1",
    ...overrides,
  };
}

function makeListResponse(
  docs: Contact[],
  overrides: Partial<ContactsResponse["data"]> = {},
): ContactsResponse {
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

function mockContactsList(overrides: Partial<ReturnType<typeof useContactsList>>) {
  (useContactsList as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("Contacts List screen", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders a card per contact with its display name", () => {
    mockContactsList({
      data: makeListResponse([
        makeContact({ _id: "c1", firstName: "Piet", lastName: "Jansen", companyName: "Acme BV" }),
      ]),
    });

    const { getByText } = renderScreen();

    expect(getByText("Piet Jansen")).toBeTruthy();
    expect(getByText("Acme BV")).toBeTruthy();
  });

  it("shows the Dutch empty state when the list is empty", () => {
    mockContactsList({ data: makeListResponse([]) });

    const { getByText } = renderScreen();

    expect(getByText("Geen contacten gevonden")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockContactsList({ isError: true, error: new Error("network down") });

    const { getByText } = renderScreen();

    expect(getByText(/network down/)).toBeTruthy();
  });

  it("filters cards by first name search text", () => {
    mockContactsList({
      data: makeListResponse([
        makeContact({ _id: "c1", firstName: "Piet", lastName: "Jansen", companyName: "Acme" }),
        makeContact({ _id: "c2", firstName: "Anna", lastName: "de Vries", companyName: "Bravo" }),
      ]),
    });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Zoek contact..."), "Anna");

    expect(getByText("Anna de Vries")).toBeTruthy();
    expect(queryByText("Piet Jansen")).toBeNull();
  });

  it("filters cards by company name search text", () => {
    mockContactsList({
      data: makeListResponse([
        makeContact({ _id: "c1", firstName: "Piet", lastName: "Jansen", companyName: "Acme" }),
        makeContact({ _id: "c2", firstName: "Anna", lastName: "de Vries", companyName: "Bravo" }),
      ]),
    });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText("Zoek contact..."), "Bravo");

    expect(getByText("Anna de Vries")).toBeTruthy();
    expect(queryByText("Piet Jansen")).toBeNull();
  });

  it("navigates to the contact detail when its card is pressed", () => {
    mockContactsList({
      data: makeListResponse([makeContact({ _id: "c42" })]),
    });

    const { getByText } = renderScreen();
    fireEvent.press(getByText("Piet Jansen"));

    expect(mockPush).toHaveBeenCalledWith("/contacts/c42");
  });

  it("navigates to the create route when the FAB is pressed", () => {
    mockContactsList({ data: makeListResponse([]) });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId("contacts-fab"));

    expect(mockPush).toHaveBeenCalledWith("/contacts/edit/create");
  });

  describe("pagination", () => {
    it("loads the next page when onEndReached fires and hasNextPage is true", async () => {
      mockContactsList({
        data: makeListResponse([makeContact({ _id: "c1" })], { hasNextPage: true }),
      });
      (contactsService.getContacts as jest.Mock).mockResolvedValue(
        makeListResponse([makeContact({ _id: "c2", firstName: "Anna", lastName: "de Vries", companyName: "Bravo" })]),
      );

      const { getByTestId, findByText } = renderScreen();
      fireEvent(getByTestId("contacts-list"), "endReached");

      expect(await findByText("Anna de Vries")).toBeTruthy();
      expect(contactsService.getContacts).toHaveBeenCalledWith({ offset: 10 });
    });

    it("does not fetch another page when hasNextPage is false", () => {
      mockContactsList({
        data: makeListResponse([makeContact({ _id: "c1" })], { hasNextPage: false }),
      });

      const { getByTestId } = renderScreen();
      fireEvent(getByTestId("contacts-list"), "endReached");

      expect(contactsService.getContacts).not.toHaveBeenCalled();
    });
  });

  it("invalidates the contacts query when pulled to refresh", async () => {
    mockContactsList({ data: makeListResponse([makeContact()]) });
    const { getByTestId, client } = renderScreen();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    fireEvent(getByTestId("contacts-list"), "refresh");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.contacts.base }),
    );
  });
});
