import { fireEvent, render } from "@testing-library/react-native";
import { useNavigation, useRouter } from "expo-router";

import SettingsDetails from "@/app/(drawer)/(tabs)/settings";
import { useSettings, useVatPreferences } from "@/hooks/useSettings";
import type { SettingsResponse } from "@/api/types/settings";
import type { VatNotificationPreferencesResponse } from "@/api/types/vatNotificationPreferences";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock("@/hooks/useSettings");

const mockSetOptions = jest.fn();
const mockPush = jest.fn();

function makeSettingsResponse(): SettingsResponse {
  return {
    success: true,
    data: {
      _id: "s1",
      country: "NL",
      currency: "EUR",
      companyName: "Acme BV",
      street: "Hoofdstraat",
      houseNumber: "1",
      postalCode: "1234AB",
      city: "Amsterdam",
      phoneNumber: "0612345678",
      companyEmail: "info@acme.nl",
      taxNumber: "NL123456789B01",
      chamberOfCommerceNumber: "12345678",
      bankName: "ING",
      bankIBAN: "NL91ABNA0417164300",
      taxPercentage: "21",
      createdAt: "2026-01-01",
      tenantId: "t1",
      __v: 0,
      agbCode: "",
      companyLogo: "",
      registerNumber: "",
      website: "https://acme.nl",
    },
  };
}

function makeVatPreferencesResponse(): VatNotificationPreferencesResponse {
  return {
    success: true,
    data: {
      _id: "vp1",
      userId: "u1",
      tenantId: "t1",
      emailNotifications: true,
      inAppNotifications: false,
      pushNotifications: true,
      advanceWarningDays: 7,
      secondReminderEnabled: false,
      secondReminderDays: 3,
      monthlyNotifications: false,
      quarterlyNotifications: true,
      yearlyNotifications: false,
      pushNotificationToken: null,
      pushNotificationPlatform: null,
      lastNotificationSent: null,
      notificationsSentCount: 0,
      preferredLanguage: "nl",
      timezone: "Europe/Amsterdam",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  };
}

function mockSettingsHook(overrides: Partial<ReturnType<typeof useSettings>> = {}) {
  (useSettings as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

function mockVatPreferencesHook(
  overrides: Partial<ReturnType<typeof useVatPreferences>> = {},
) {
  (useVatPreferences as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("Settings Details screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    mockSettingsHook();
    mockVatPreferencesHook();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders company/invoice-default fields once loaded", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    const { getByText } = render(<SettingsDetails />);

    expect(getByText("Acme BV")).toBeTruthy();
    expect(getByText("info@acme.nl")).toBeTruthy();
    expect(getByText("0612345678")).toBeTruthy();
    expect(getByText("NL123456789B01")).toBeTruthy();
    expect(getByText("NL91ABNA0417164300")).toBeTruthy();
  });

  it("renders VAT-preference values once loaded", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    const { getByTestId } = render(<SettingsDetails />);

    expect(getByTestId("vat-quarterly-notifications").props.value).toBe(true);
    expect(getByTestId("vat-email-notifications").props.value).toBe(true);
    expect(getByTestId("vat-push-notifications").props.value).toBe(true);
  });

  it("shows a loading state while the settings query is pending", () => {
    mockSettingsHook({ isLoading: true });
    mockVatPreferencesHook({});

    const { getByTestId } = render(<SettingsDetails />);

    expect(getByTestId("settings-loading")).toBeTruthy();
  });

  it("shows a Dutch error message when the settings query fails", () => {
    mockSettingsHook({
      isError: true,
      error: new Error("Fout bij ophalen instellingen"),
    });
    mockVatPreferencesHook({});

    const { getByText } = render(<SettingsDetails />);

    expect(getByText(/Fout bij ophalen instellingen/)).toBeTruthy();
  });

  it("navigates to /settings/edit when the edit action is pressed", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    render(<SettingsDetails />);

    const headerRight = mockSetOptions.mock.calls.at(-1)?.[0].headerRight;
    const { getByTestId } = render(headerRight());
    fireEvent.press(getByTestId("settings-edit-button"));

    expect(mockPush).toHaveBeenCalledWith("/settings/edit");
  });

  it("themes the native header", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({});

    render(<SettingsDetails />);

    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    expect(options.title).toBe("Instellingen");
    expect(options.headerShown).toBe(true);
  });
});
