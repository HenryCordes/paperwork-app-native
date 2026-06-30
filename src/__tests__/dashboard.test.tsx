// Mock Firebase modules that are imported at module load time by
// usePushNotifications, which is now imported in _layout.tsx
jest.mock("@react-native-firebase/app", () => ({}));
jest.mock("@react-native-firebase/messaging", () => ({}));
jest.mock("@/services/firebase-messaging.service", () => ({
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  getToken: jest.fn(),
  onTokenRefreshed: jest.fn(() => jest.fn()),
}));
jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/hooks/useNotifications", () => ({
  useNotificationTokens: jest.fn(() => ({ registerToken: jest.fn() })),
  useNotificationSettings: jest.fn(() => ({ updateSettings: jest.fn() })),
}));
jest.mock("@/hooks/useBadge", () => ({
  useBadge: jest.fn(),
}));
jest.mock("@/hooks/useNotificationReceiver", () => ({
  useNotificationReceiver: jest.fn(),
}));
jest.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: jest.fn(() => ({
    initialize: jest.fn(),
    isInitialized: false,
    fcmToken: null,
    permissionStatus: { granted: false, denied: false, prompt: true },
    settings: { enabled: false },
    loading: false,
    error: null,
    requestPermissions: jest.fn(),
    refreshToken: jest.fn(),
    updateSettings: jest.fn(),
  })),
}));

import { renderRouter, screen } from "expo-router/testing-library";

import authService from "@/api/services/authService";

jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.mock("@/hooks/biometrics/useBiometrics", () => ({
  useBiometrics: () => ({
    checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false }),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    getCredentials: jest.fn().mockResolvedValue(null),
    authenticate: jest.fn(),
    saveCredentials: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    clearCredentials: jest.fn(),
  }),
}));

describe("root redirect", () => {
  it("redirects to /login when not authenticated", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
    renderRouter("src/app", { initialUrl: "/" });

    expect(await screen.findByTestId("login-submit")).toBeOnTheScreen();
  });

  it("redirects to /dashboard when authenticated", async () => {
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    renderRouter("src/app", { initialUrl: "/" });

    expect(await screen.findByText("Laden...")).toBeOnTheScreen();
  });
});

it("renders the dashboard screen at /dashboard directly", async () => {
  (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
  renderRouter("src/app", { initialUrl: "/dashboard" });
  expect(await screen.findByText("Laden...")).toBeOnTheScreen();
});
