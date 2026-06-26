import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useContactsList } from "@/hooks/useContacts";
import contactsService from "@/api/services/contactsService";
import QueryKeys from "@/api/queryKeys";
import type { ContactsResponse } from "@/api/types/contacts";

jest.mock("@/api/services/contactsService", () => ({
  __esModule: true,
  default: { getContacts: jest.fn() },
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

const makeSuccessResponse = (): ContactsResponse => ({
  success: true,
  data: { docs: [{ _id: "1", companyName: "Acme" }] },
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
    expect(contactsService.getContacts).toHaveBeenCalledWith();
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

  it("uses QueryKeys.contacts.list() as the real runtime query key", async () => {
    const response = makeSuccessResponse();
    (contactsService.getContacts as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useContactsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.contacts.list());
  });
});
