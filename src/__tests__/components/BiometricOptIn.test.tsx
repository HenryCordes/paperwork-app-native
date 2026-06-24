import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { BiometricOptIn } from "@/components/BiometricOptIn";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";

jest.mock("@/hooks/biometrics/useBiometrics");

const mockCheckAvailability = jest.fn();
const mockSaveCredentials = jest.fn();
const mockSetBiometricsEnabled = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useBiometrics as jest.Mock).mockReturnValue({
    checkAvailability: mockCheckAvailability,
    saveCredentials: mockSaveCredentials,
    setBiometricsEnabled: mockSetBiometricsEnabled,
  });
});

describe("BiometricOptIn", () => {
  it("shows the unavailable message and calls onComplete(false) when biometrics aren't available", async () => {
    mockCheckAvailability.mockResolvedValue({ isAvailable: false });
    const onComplete = jest.fn();

    const { findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(await findByText("Doorgaan zonder biometrie"));
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it("saves credentials and enables biometrics when the user opts in", async () => {
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      canUseFaceID: true,
    });
    const onComplete = jest.fn();

    const { findByRole, findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />
    );

    fireEvent(await findByRole("switch"), "valueChange", true);
    fireEvent.press(await findByText("Doorgaan"));

    await waitFor(() =>
      expect(mockSaveCredentials).toHaveBeenCalledWith({
        username: "a@b.com",
        password: "pw",
      })
    );
    expect(mockSetBiometricsEnabled).toHaveBeenCalledWith(true);
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it("does not save credentials when the user declines", async () => {
    mockCheckAvailability.mockResolvedValue({ isAvailable: true });
    const onComplete = jest.fn();

    const { findByText } = render(
      <BiometricOptIn
        username="a@b.com"
        password="pw"
        onComplete={onComplete}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(await findByText("Doorgaan"));

    expect(mockSaveCredentials).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(false);
  });
});
