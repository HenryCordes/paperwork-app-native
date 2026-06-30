import { renderHook, waitFor, act } from "@testing-library/react-native";
import { Platform } from "react-native";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import * as firebaseMessagingService from "@/services/firebase-messaging.service";
import { secureStorage } from "@/services/secureStorage";
import { useNotificationTokens, useNotificationSettings } from "@/hooks/useNotifications";

jest.mock("@/services/firebase-messaging.service", () => ({
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  getToken: jest.fn(),
  onTokenRefreshed: jest.fn(() => jest.fn()),
}));

jest.mock("@/services/secureStorage", () => ({
  secureStorage: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotificationTokens: jest.fn(),
  useNotificationSettings: jest.fn(),
}));

describe("usePushNotifications", () => {
  const registerToken = jest.fn();
  const updateApiSettings = jest.fn();

  beforeEach(() => {
    (useNotificationTokens as jest.Mock).mockReturnValue({ registerToken });
    (useNotificationSettings as jest.Mock).mockReturnValue({ updateSettings: updateApiSettings });
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requests permission, fetches a token, and registers it when permission was not yet determined", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      denied: false,
      prompt: true,
    });
    (firebaseMessagingService.requestPermissions as jest.Mock).mockResolvedValue({
      granted: true,
      denied: false,
      prompt: false,
    });
    (firebaseMessagingService.getToken as jest.Mock).mockResolvedValue("token-1");

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.requestPermissions).toHaveBeenCalled();
    expect(result.current.fcmToken).toBe("token-1");
    expect(result.current.isInitialized).toBe(true);
    expect(registerToken).toHaveBeenCalledWith({ token: "token-1", platform: Platform.OS });
  });

  it("does not request a token when permission is denied", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      denied: true,
      prompt: false,
    });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.getToken).not.toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.fcmToken).toBeNull();
  });

  it("sets a Dutch error and stays uninitialized when the service throws", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.error).toBe("Kon push notificaties niet initialiseren");
    expect(result.current.isInitialized).toBe(false);
  });

  it("does not re-initialize on a second call", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: true,
      denied: false,
      prompt: false,
    });
    (firebaseMessagingService.getToken as jest.Mock).mockResolvedValue("token-1");

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });
    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.getToken).toHaveBeenCalledTimes(1);
  });

  it("re-registers the token when firebase-messaging.service reports a refresh", () => {
    let refreshHandler!: (token: string) => void;
    (firebaseMessagingService.onTokenRefreshed as jest.Mock).mockImplementation((handler) => {
      refreshHandler = handler;
      return jest.fn();
    });

    renderHook(() => usePushNotifications());

    act(() => {
      refreshHandler("refreshed-token");
    });

    expect(registerToken).toHaveBeenCalledWith({
      token: "refreshed-token",
      platform: Platform.OS,
    });
  });

  it("persists settings to secureStorage and syncs them to the backend", async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.updateSettings({ enabled: true });
    });

    expect(secureStorage.setItem).toHaveBeenCalledWith(
      "push_notification_settings",
      JSON.stringify({ enabled: true }),
    );
    expect(updateApiSettings).toHaveBeenCalledWith({ enabled: true });
  });

  it("loads persisted settings from secureStorage on mount", async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ enabled: true }));

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => expect(result.current.settings).toEqual({ enabled: true }));
  });
});
