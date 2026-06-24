import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import authService from "@/api/services/authService";
import { secureStorage } from "@/services/secureStorage";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  RECENT_LOGOUT_KEY: "recent_logout",
}));

function renderUseAuth() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("useAuth", () => {
  beforeEach(() => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("logs in and flips isAuthenticated", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { result } = renderUseAuth();
    await waitFor(() => expect(result.current.isAuthenticated()).toBe(false));

    await act(async () => {
      await result.current.login.mutateAsync({
        email: "a@b.com",
        password: "pw",
      });
    });

    expect(result.current.isAuthenticated()).toBe(true);
    expect(result.current.getCurrentUser()).toEqual({
      id: "1",
      email: "a@b.com",
      name: "A",
    });
  });

  it("logs out, flips isAuthenticated, and sets the recent-logout flag", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { result } = renderUseAuth();
    await act(async () => {
      await result.current.login.mutateAsync({
        email: "a@b.com",
        password: "pw",
      });
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated()).toBe(false);
    expect(secureStorage.setItem).toHaveBeenCalledWith(
      "recent_logout",
      "true"
    );
    expect(authService.logout).toHaveBeenCalled();
  });
});
