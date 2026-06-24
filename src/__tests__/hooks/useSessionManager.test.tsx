import { renderHook, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import { useSessionManager } from "@/hooks/useSessionManager";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { useAuth } from "@/hooks/useAuth";
import {
  secureStorage,
  LAST_ACTIVE_KEY,
  RECENT_LOGOUT_KEY,
  SESSION_TIMEOUT_KEY,
  AUTH_IN_PROGRESS_KEY,
} from "@/services/secureStorage";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/biometrics/useBiometrics");
jest.mock("@/hooks/useAuth");
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  LAST_ACTIVE_KEY: "last_active_timestamp",
  RECENT_LOGOUT_KEY: "recent_logout",
  SESSION_TIMEOUT_KEY: "session_timeout_minutes",
  AUTH_IN_PROGRESS_KEY: "auth_in_progress",
}));

const mockReplace = jest.fn();
const mockLoginMutateAsync = jest.fn();
const mockAuthenticate = jest.fn();
const mockGetCredentials = jest.fn();
const mockIsBiometricsEnabled = jest.fn();
const mockCheckAvailability = jest.fn();

function mockStorage(values: Record<string, string | null>) {
  (secureStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(key in values ? values[key] : null)
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  (useAuth as jest.Mock).mockReturnValue({
    login: { mutateAsync: mockLoginMutateAsync },
  });
  (useBiometrics as jest.Mock).mockReturnValue({
    isBiometricsEnabled: mockIsBiometricsEnabled,
    authenticate: mockAuthenticate,
    getCredentials: mockGetCredentials,
    checkAvailability: mockCheckAvailability,
  });
  mockStorage({});
});

describe("useSessionManager", () => {
  it("treats a session as timed out once elapsed time exceeds the stored timeout, and checks biometrics", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(false);

    renderHook(() => useSessionManager());

    await waitFor(() => expect(mockIsBiometricsEnabled).toHaveBeenCalled());
  });

  it("does not treat a session as timed out within the window, and skips biometrics", async () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: fiveMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        LAST_ACTIVE_KEY,
        expect.any(String)
      )
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
  });

  it("never attempts biometric auth on Android, even after timeout", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "android" });

    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });

    renderHook(() => useSessionManager());
    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_IN_PROGRESS_KEY,
        "true"
      )
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
    expect(mockAuthenticate).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });

  it("skips automatic biometric auth when the recent-logout flag is set", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
      [RECENT_LOGOUT_KEY]: "true",
    });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_IN_PROGRESS_KEY,
        "true"
      )
    );
    expect(mockIsBiometricsEnabled).not.toHaveBeenCalled();
  });

  it("logs back in with stored credentials after a successful biometric re-auth", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    mockCheckAvailability.mockResolvedValue({ biometryType: "face" });
    mockAuthenticate.mockResolvedValue(true);
    mockLoginMutateAsync.mockResolvedValue({ token: "abc", user: {} });

    renderHook(() => useSessionManager());

    await waitFor(() =>
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "pw",
      })
    );
  });

  it("redirects to /login when biometric re-auth fails", async () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    mockStorage({
      [LAST_ACTIVE_KEY]: sixteenMinutesAgo.toString(),
      [SESSION_TIMEOUT_KEY]: "15",
    });
    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    mockCheckAvailability.mockResolvedValue({ biometryType: "face" });
    mockAuthenticate.mockResolvedValue(false);

    renderHook(() => useSessionManager());

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });
});
