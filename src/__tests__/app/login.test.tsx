import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import Login from "@/app/login";
import { AuthProvider } from "@/contexts/AuthContext";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import authService from "@/api/services/authService";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("@/hooks/biometrics/useBiometrics");
jest.mock("@/api/services/authService", () => ({
  __esModule: true,
  default: { isAuthenticated: jest.fn(), login: jest.fn(), logout: jest.fn() },
}));
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockReplace = jest.fn();
const mockPush = jest.fn();

function renderLogin() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({
    replace: mockReplace,
    push: mockPush,
  });
  (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
  (useBiometrics as jest.Mock).mockReturnValue({
    checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false }),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    getCredentials: jest.fn().mockResolvedValue(null),
    authenticate: jest.fn(),
    saveCredentials: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    clearCredentials: jest.fn(),
  });
});

describe("Login screen", () => {
  it("shows a validation alert when fields are empty", async () => {
    const { getByTestId } = renderLogin();

    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Fout",
        "Vul alstublieft alle velden in"
      )
    );
  });

  it("navigates to /dashboard after a successful login with no biometrics available", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      token: "abc",
      user: { id: "1", email: "a@b.com", name: "A" },
    });

    const { getByTestId } = renderLogin();

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "pw");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("shows the API's error message on failed login", async () => {
    (authService.login as jest.Mock).mockRejectedValue(
      new Error("Inloggegevens onjuist")
    );

    const { getByTestId } = renderLogin();

    fireEvent.changeText(getByTestId("login-email"), "a@b.com");
    fireEvent.changeText(getByTestId("login-password"), "wrong");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Fout",
        "Inloggegevens onjuist"
      )
    );
  });
});
