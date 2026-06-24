import { renderHook, waitFor, act } from "@testing-library/react-native";

import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import authService from "@/api/services/authService";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn() },
}));

describe("AuthProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("starts loading and resolves to authenticated when a token exists", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("resolves to unauthenticated when no token exists", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("setAuthenticated updates state synchronously", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setAuthenticated(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
