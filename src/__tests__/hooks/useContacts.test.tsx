import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useContactsList, useContactById, useCreateOrUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import type { Contact, ContactCreateUpdateRequest, ContactsResponse } from "@/api/types/contacts";

// Silence unused import warning — Contact and ContactCreateUpdateRequest are used below in new describe blocks
type _Unused = Contact | ContactCreateUpdateRequest;

jest.mock("@/api/services/contactsService", () => ({
  __esModule: true,
  default: {
    getContacts: jest.fn(),
    getContactById: jest.fn(),
    createOrUpdateContact: jest.fn(),
    deleteContact: jest.fn(),
  },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  _id: "1",
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
  id: "1",
  ...overrides,
});

const makeSuccessResponse = (): ContactsResponse => ({
  success: true,
  data: {
    docs: [makeContact()],
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
});

describe("useContactsList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves", async () => {
    const response = makeSuccessResponse();
    (contactsService.getContacts as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useContactsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(response);
    expect(contactsService.getContacts).toHaveBeenCalledWith({ offset: 0 });
  });

  it("forwards an explicit offset to the service and into the query key", async () => {
    (contactsService.getContacts as jest.Mock).mockResolvedValue(makeSuccessResponse());

    const { result, client } = renderWithClient(() => useContactsList({ offset: 20 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(contactsService.getContacts).toHaveBeenCalledWith({ offset: 20 });
    expect(client.getQueryCache().getAll()[0].queryKey).toEqual(
      QueryKeys.contacts.list(20),
    );
  });

  it("exposes isLoading=true before the service resolves", () => {
    (contactsService.getContacts as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useContactsList());

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (contactsService.getContacts as jest.Mock).mockRejectedValue(new Error("network error"));

    const { result } = renderWithClient(() => useContactsList());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("uses QueryKeys.contacts.list(0) as the real runtime query key by default", async () => {
    const response = makeSuccessResponse();
    (contactsService.getContacts as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useContactsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.contacts.list(0));
  });
});

const makeContactRequest = (overrides: Partial<ContactCreateUpdateRequest> = {}): ContactCreateUpdateRequest => ({
  companyName: "Acme",
  typeOfContact: "Klant",
  typeName: "Bedrijf",
  lastName: "Jansen",
  firstName: "Piet",
  initials: "P",
  emailAddress: "piet@acme.nl",
  ...overrides,
});

describe("useContactById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not call the service when id is undefined", () => {
    const { result } = renderWithClient(() => useContactById(undefined));

    expect(result.current.fetchStatus).toBe("idle");
    expect(contactsService.getContactById).not.toHaveBeenCalled();
  });

  it('does not call the service when id is "create"', () => {
    const { result } = renderWithClient(() => useContactById("create"));

    expect(result.current.fetchStatus).toBe("idle");
    expect(contactsService.getContactById).not.toHaveBeenCalled();
  });

  it("fetches the contact detail for a real id", async () => {
    const response = { success: true, data: makeContact() };
    (contactsService.getContactById as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useContactById("c1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(contactsService.getContactById).toHaveBeenCalledWith("c1");
  });
});

describe("useCreateOrUpdateContact", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the mutation's input on mutate", async () => {
    const response = { success: true, data: makeContact() };
    (contactsService.createOrUpdateContact as jest.Mock).mockResolvedValue(response);
    const data = makeContactRequest();

    const { result } = renderWithClient(() => useCreateOrUpdateContact());

    act(() => {
      result.current.mutate(data);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(contactsService.createOrUpdateContact).toHaveBeenCalledWith(data);
  });

  it("invalidates QueryKeys.contacts.base on success", async () => {
    const response = { success: true, data: makeContact() };
    (contactsService.createOrUpdateContact as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useCreateOrUpdateContact());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate(makeContactRequest());
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.contacts.base });
  });
});

describe("useDeleteContact", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the id on mutate", async () => {
    (contactsService.deleteContact as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderWithClient(() => useDeleteContact());

    act(() => {
      result.current.mutate("c1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(contactsService.deleteContact).toHaveBeenCalledWith("c1");
  });

  it("invalidates QueryKeys.contacts.base on success", async () => {
    (contactsService.deleteContact as jest.Mock).mockResolvedValue({ success: true });

    const { result, client } = renderWithClient(() => useDeleteContact());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("c1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.contacts.base });
  });
});
