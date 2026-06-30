import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { useNavigation } from "expo-router";

import Profile from "@/app/(drawer)/(tabs)/profile";
import { useProfile } from "@/hooks/useProfile";
import { useBiometrics } from "@/hooks/biometrics/useBiometrics";
import { BiometricType } from "@/hooks/biometrics/biometrics.types";
import type { UserProfile } from "@/api/types";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
}));
jest.mock("@/hooks/useProfile");
jest.mock("@/hooks/biometrics/useBiometrics");

const mockSetOptions = jest.fn();

const profile: UserProfile = {
  _id: "u1",
  name: "Jane Doe",
  companyName: "Acme BV",
  email: "jane@acme.nl",
  role: "admin",
  organization: "org-1",
  createdAt: "2024-01-15T00:00:00.000Z",
  __v: 0,
};

function mockProfileQuery(
  overrides: Partial<ReturnType<typeof useProfile>> & { error?: Error | undefined } = {}
) {
  (useProfile as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    ...overrides,
  });
}

function mockBiometrics(overrides: Partial<ReturnType<typeof useBiometrics>> = {}) {
  (useBiometrics as jest.Mock).mockReturnValue({
    checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false, biometryType: BiometricType.NONE }),
    isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    setBiometricsEnabled: jest.fn().mockResolvedValue(undefined),
    authenticate: jest.fn(),
    saveCredentials: jest.fn(),
    getCredentials: jest.fn(),
    clearCredentials: jest.fn(),
    ...overrides,
  });
}

describe("Profile screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    mockBiometrics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while the profile query is pending", () => {
    mockProfileQuery({ isLoading: true });
    const { getByTestId } = render(<Profile />);
    expect(getByTestId("profile-loading")).toBeTruthy();
  });

  it("shows the Dutch error message when the profile query fails", async () => {
    mockProfileQuery({ isError: true, error: new Error("Kon profielgegevens niet ophalen") });
    const { getByText } = render(<Profile />);
    expect(getByText("Kon profielgegevens niet ophalen")).toBeTruthy();
  });

  it("falls back to a generic Dutch error when error has no message", async () => {
    mockProfileQuery({ isError: true, error: undefined });
    const { getByText } = render(<Profile />);
    expect(getByText("Kon profielgegevens niet laden")).toBeTruthy();
  });

  it("renders profile fields once the query resolves", async () => {
    mockProfileQuery({ data: profile });
    const { getAllByText, getByText } = render(<Profile />);
    // name appears twice (header + field row), so use getAllByText
    expect(getAllByText("Jane Doe").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Acme BV")).toBeTruthy();
    expect(getByText("jane@acme.nl")).toBeTruthy();
    expect(getByText("admin")).toBeTruthy();
    // Date formatted with toLocaleDateString nl-NL (day/month/year)
    expect(getByText(new Date("2024-01-15T00:00:00.000Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))).toBeTruthy();
  });

  it("hides the biometric toggle when biometrics are not available", async () => {
    mockProfileQuery({ data: profile });
    mockBiometrics({
      checkAvailability: jest.fn().mockResolvedValue({ isAvailable: false, biometryType: BiometricType.NONE }),
    });
    const { queryByTestId } = render(<Profile />);
    await waitFor(() => {
      expect(queryByTestId("biometric-toggle")).toBeNull();
    });
  });

  it("shows the biometric toggle when biometrics are available", async () => {
    mockProfileQuery({ data: profile });
    mockBiometrics({
      checkAvailability: jest.fn().mockResolvedValue({ isAvailable: true, biometryType: BiometricType.FINGERPRINT }),
      isBiometricsEnabled: jest.fn().mockResolvedValue(true),
    });
    const { findByTestId } = render(<Profile />);
    const toggle = await findByTestId("biometric-toggle");
    expect(toggle).toBeTruthy();
  });

  it("shows TouchId label when biometry type is FINGERPRINT on iOS", async () => {
    mockProfileQuery({ data: profile });
    mockBiometrics({
      checkAvailability: jest.fn().mockResolvedValue({ isAvailable: true, biometryType: BiometricType.FINGERPRINT }),
      isBiometricsEnabled: jest.fn().mockResolvedValue(false),
    });
    const { findByText } = render(<Profile />);
    // getBiometricName with FINGERPRINT returns "TouchId" on non-Android
    const label = await findByText(/TouchId|fingerprint unlock|vingerafdruk/i);
    expect(label).toBeTruthy();
  });

  it("calls setBiometricsEnabled when the toggle is flipped", async () => {
    const setBiometricsEnabled = jest.fn().mockResolvedValue(undefined);
    mockProfileQuery({ data: profile });
    mockBiometrics({
      checkAvailability: jest.fn().mockResolvedValue({ isAvailable: true, biometryType: BiometricType.FINGERPRINT }),
      isBiometricsEnabled: jest.fn().mockResolvedValue(false),
      setBiometricsEnabled,
    });

    const { findByTestId } = render(<Profile />);
    const toggle = await findByTestId("biometric-toggle");

    await act(async () => {
      fireEvent(toggle, "valueChange", true);
    });

    expect(setBiometricsEnabled).toHaveBeenCalledWith(true);
  });
});
