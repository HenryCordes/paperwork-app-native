import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useProfile } from "@/hooks/useProfile";
import authService from "@/api/services/authService";
import QueryKeys from "@/api/queryKeys";
import type { UserProfile } from "@/api/types";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: {
    getProfile: jest.fn(),
    isAuthenticated: jest.fn(),
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

const profile: UserProfile = {
  _id: "u1",
  name: "Jane Doe",
  companyName: "Acme BV",
  email: "jane@acme.nl",
  role: "admin",
  organization: "org-1",
  createdAt: "2024-01-01T00:00:00.000Z",
  __v: 0,
};

describe("useProfile", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves when authenticated", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getProfile as jest.Mock).mockResolvedValue(profile);

    const { result } = renderWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(profile);
    expect(authService.getProfile).toHaveBeenCalled();
  });

  it("exposes isLoading=true before the service resolves", () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getProfile as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useProfile());

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getProfile as jest.Mock).mockRejectedValue(
      new Error("Kon profielgegevens niet ophalen")
    );

    const { result } = renderWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      "Kon profielgegevens niet ophalen"
    );
  });

  it("uses QueryKeys.auth.profile() as the real runtime query key", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getProfile as jest.Mock).mockResolvedValue(profile);

    const { result, client } = renderWithClient(() => useProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.auth.profile());
  });
});
