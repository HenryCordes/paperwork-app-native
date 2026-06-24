import { render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { BiometricLogin } from "@/components/BiometricLogin";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";

jest.mock("@/hooks/biometrics/useBiometrics");

const mockAuthenticate = jest.fn();
const mockCheckAvailability = jest.fn();
const mockGetCredentials = jest.fn();
const mockIsBiometricsEnabled = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useBiometrics as jest.Mock).mockReturnValue({
    authenticate: mockAuthenticate,
    checkAvailability: mockCheckAvailability,
    getCredentials: mockGetCredentials,
    isBiometricsEnabled: mockIsBiometricsEnabled,
  });
});

describe("BiometricLogin", () => {
  it("calls onCancel immediately when biometrics aren't enabled", async () => {
    mockIsBiometricsEnabled.mockResolvedValue(false);
    const onCancel = jest.fn();

    render(<BiometricLogin onLoginSuccess={jest.fn()} onCancel={onCancel} />);

    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("auto-prompts on iOS and calls onLoginSuccess with stored credentials", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "ios" });

    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      biometryType: "face",
    });
    mockAuthenticate.mockResolvedValue(true);
    mockGetCredentials.mockResolvedValue({
      username: "a@b.com",
      password: "pw",
    });
    const onLoginSuccess = jest.fn();

    render(
      <BiometricLogin onLoginSuccess={onLoginSuccess} onCancel={jest.fn()} />
    );

    await waitFor(() =>
      expect(onLoginSuccess).toHaveBeenCalledWith("a@b.com", "pw")
    );

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });

  it("does not auto-prompt on Android", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "android" });

    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      biometryType: "fingerprint",
    });

    render(<BiometricLogin onLoginSuccess={jest.fn()} onCancel={jest.fn()} />);

    await waitFor(() => expect(mockCheckAvailability).toHaveBeenCalled());
    expect(mockAuthenticate).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });
});
