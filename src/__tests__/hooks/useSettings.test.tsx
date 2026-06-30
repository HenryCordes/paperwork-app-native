import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useSettings,
  useUpdateSettings,
  useVatPreferences,
  useUpdateVatPreferences,
} from "@/hooks/useSettings";
import settingsService from "@/api/services/settingsService";
import vatNotificationPreferencesService from "@/api/services/vatNotificationPreferencesService";
import QueryKeys from "@/api/queryKeys";
import type { SettingsResponse } from "@/api/types/settings";
import type { VatNotificationPreferencesResponse } from "@/api/types/vatNotificationPreferences";

jest.mock("@/api/services/settingsService", () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock("@/api/services/vatNotificationPreferencesService", () => ({
  __esModule: true,
  default: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makeSettingsResponse = (): SettingsResponse => ({
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
});

const makeVatPreferencesResponse = (): VatNotificationPreferencesResponse => ({
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
});

describe("useSettings", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves", async () => {
    const response = makeSettingsResponse();
    (settingsService.getSettings as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useSettings());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("exposes isLoading=true before the service resolves", () => {
    (settingsService.getSettings as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderWithClient(() => useSettings());

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (settingsService.getSettings as jest.Mock).mockRejectedValue(
      new Error("Fout bij ophalen instellingen"),
    );

    const { result } = renderWithClient(() => useSettings());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Fout bij ophalen instellingen");
  });

  it("uses QueryKeys.settings.detail() as the runtime query key", async () => {
    const response = makeSettingsResponse();
    (settingsService.getSettings as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useSettings());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.settings.detail());
  });
});

describe("useUpdateSettings", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the mutation's input on mutate", async () => {
    const response = makeSettingsResponse();
    (settingsService.updateSettings as jest.Mock).mockResolvedValue(response);
    const update = { companyName: "New Name" };

    const { result } = renderWithClient(() => useUpdateSettings());

    act(() => {
      result.current.mutate(update);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(settingsService.updateSettings).toHaveBeenCalledWith(update);
  });

  it("invalidates QueryKeys.settings.detail() on success", async () => {
    const response = makeSettingsResponse();
    (settingsService.updateSettings as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useUpdateSettings());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate({ companyName: "New Name" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.settings.detail() });
  });
});

describe("useVatPreferences", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the data the service resolves", async () => {
    const response = makeVatPreferencesResponse();
    (vatNotificationPreferencesService.getPreferences as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useVatPreferences());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("exposes isLoading=true before the service resolves", () => {
    (vatNotificationPreferencesService.getPreferences as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    const { result } = renderWithClient(() => useVatPreferences());

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes isError=true when the service rejects", async () => {
    (vatNotificationPreferencesService.getPreferences as jest.Mock).mockRejectedValue(
      new Error("Fout bij ophalen BTW-notificatievoorkeuren"),
    );

    const { result } = renderWithClient(() => useVatPreferences());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Fout bij ophalen BTW-notificatievoorkeuren");
  });

  it("uses QueryKeys.settings.vatPreferences() as the runtime query key", async () => {
    const response = makeVatPreferencesResponse();
    (vatNotificationPreferencesService.getPreferences as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useVatPreferences());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(QueryKeys.settings.vatPreferences());
  });
});

describe("useUpdateVatPreferences", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the mutation's input on mutate", async () => {
    const response = makeVatPreferencesResponse();
    (vatNotificationPreferencesService.updatePreferences as jest.Mock).mockResolvedValue(response);
    const update = { emailNotifications: false };

    const { result } = renderWithClient(() => useUpdateVatPreferences());

    act(() => {
      result.current.mutate(update);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vatNotificationPreferencesService.updatePreferences).toHaveBeenCalledWith(update);
  });

  it("invalidates QueryKeys.settings.vatPreferences() on success", async () => {
    const response = makeVatPreferencesResponse();
    (vatNotificationPreferencesService.updatePreferences as jest.Mock).mockResolvedValue(response);

    const { result, client } = renderWithClient(() => useUpdateVatPreferences());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate({ emailNotifications: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.settings.vatPreferences() });
  });
});
