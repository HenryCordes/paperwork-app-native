import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useNavigation, useRouter } from "expo-router";

import SettingsEdit from "@/app/settings/edit";
import {
  useSettings,
  useUpdateSettings,
  useVatPreferences,
  useUpdateVatPreferences,
} from "@/hooks/useSettings";
import type { SettingsResponse } from "@/api/types/settings";
import type { VatNotificationPreferencesResponse } from "@/api/types/vatNotificationPreferences";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock("@/hooks/useSettings");

const mockSetOptions = jest.fn();
const mockBack = jest.fn();
const mutateSettings = jest.fn();
const mutateVatPrefs = jest.fn();

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
      pushNotifications: false,
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

describe("Settings Edit screen", () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ setOptions: mockSetOptions });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });
    mutateSettings.mockResolvedValue({});
    mutateVatPrefs.mockResolvedValue({});
    (useUpdateSettings as jest.Mock).mockReturnValue({
      mutateAsync: mutateSettings,
      isPending: false,
    });
    (useUpdateVatPreferences as jest.Mock).mockReturnValue({
      mutateAsync: mutateVatPrefs,
      isPending: false,
    });
    mockSettingsHook();
    mockVatPreferencesHook();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("pre-fills the company fields from useSettings", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({});

    const { getByTestId } = render(<SettingsEdit />);

    expect(getByTestId("settings-company-name-input").props.value).toBe("Acme BV");
    expect(getByTestId("settings-company-email-input").props.value).toBe("info@acme.nl");
    expect(getByTestId("settings-phone-input").props.value).toBe("0612345678");
    expect(getByTestId("settings-bank-iban-input").props.value).toBe("NL91ABNA0417164300");
  });

  it("pre-fills VAT-preference toggles from useVatPreferences", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    const { getByTestId } = render(<SettingsEdit />);

    expect(getByTestId("vat-email-notifications-switch").props.value).toBe(true);
    expect(getByTestId("vat-quarterly-notifications-switch").props.value).toBe(true);
    expect(getByTestId("vat-push-notifications-switch").props.value).toBe(false);
  });

  it("editing a settings field and saving calls useUpdateSettings with the changed payload", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    const { getByTestId } = render(<SettingsEdit />);

    fireEvent.changeText(getByTestId("settings-company-name-input"), "Nieuwe Naam BV");
    fireEvent.press(getByTestId("settings-save-button"));

    expect(mutateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: "Nieuwe Naam BV" }),
    );
  });

  it("toggling a VAT-notification preference and saving calls useUpdateVatPreferences", () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });

    const { getByTestId } = render(<SettingsEdit />);

    fireEvent(getByTestId("vat-push-notifications-switch"), "valueChange", true);
    fireEvent.press(getByTestId("settings-save-button"));

    expect(mutateVatPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ pushNotifications: true }),
    );
  });

  it("shows a Dutch error when the settings mutation fails", async () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({});

    mutateSettings.mockRejectedValue(new Error("Fout bij bijwerken instellingen"));

    const { getByTestId, findByText } = render(<SettingsEdit />);
    fireEvent.press(getByTestId("settings-save-button"));

    expect(await findByText("Fout bij bijwerken instellingen")).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("navigates back after a successful settings save", async () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({});

    const { getByTestId } = render(<SettingsEdit />);
    fireEvent.press(getByTestId("settings-save-button"));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it("does not navigate back when the VAT update fails", async () => {
    mockSettingsHook({ data: makeSettingsResponse() });
    mockVatPreferencesHook({ data: makeVatPreferencesResponse() });
    mutateVatPrefs.mockRejectedValue(
      new Error("Fout bij bijwerken BTW-notificatievoorkeuren"),
    );

    const { getByTestId, findByText } = render(<SettingsEdit />);
    fireEvent.press(getByTestId("settings-save-button"));

    expect(
      await findByText("Fout bij bijwerken BTW-notificatievoorkeuren"),
    ).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("themes the native header", () => {
    mockSettingsHook({});
    mockVatPreferencesHook({});

    render(<SettingsEdit />);

    const options = mockSetOptions.mock.calls.at(-1)?.[0];
    expect(options.title).toBe("Instellingen bewerken");
    expect(options.headerShown).toBe(true);
  });
});
