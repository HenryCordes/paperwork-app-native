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
