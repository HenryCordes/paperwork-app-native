import {
  hasPermission,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";

import {
  checkPermissions,
  requestPermissions,
  getToken as fetchToken,
  onTokenRefreshed,
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock("@react-native-firebase/messaging", () => ({
  getMessaging: jest.fn(() => ({})),
  hasPermission: jest.fn(),
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
}));

describe("firebase-messaging.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkPermissions", () => {
    it("maps AUTHORIZED to granted", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.AUTHORIZED);
      expect(await checkPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });

    it("maps PROVISIONAL to granted", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.PROVISIONAL);
      expect(await checkPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });

    it("maps DENIED to denied", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.DENIED);
      expect(await checkPermissions()).toEqual({ granted: false, denied: true, prompt: false });
    });

    it("maps NOT_DETERMINED to prompt", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.NOT_DETERMINED);
      expect(await checkPermissions()).toEqual({ granted: false, denied: false, prompt: true });
    });
  });

  describe("requestPermissions", () => {
    it("returns the mapped status from requestPermission", async () => {
      (requestPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.AUTHORIZED);
      expect(await requestPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });
  });

  describe("getToken (re-exported)", () => {
    it("returns the FCM token", async () => {
      (getToken as jest.Mock).mockResolvedValue("token-123");
      expect(await fetchToken()).toBe("token-123");
    });
  });

  describe("onTokenRefreshed", () => {
    it("subscribes via onTokenRefresh and returns its unsubscribe function", () => {
      const unsubscribe = jest.fn();
      (onTokenRefresh as jest.Mock).mockReturnValue(unsubscribe);
      const handler = jest.fn();

      const result = onTokenRefreshed(handler);

      expect(onTokenRefresh).toHaveBeenCalledWith(expect.anything(), handler);
      expect(result).toBe(unsubscribe);
    });
  });

  describe("onForegroundMessage", () => {
    it("parses the RemoteMessage into a NotificationPayload", () => {
      let capturedListener!: (message: unknown) => void;
      (onMessage as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onForegroundMessage(handler);
      capturedListener({
        messageId: "m1",
        notification: { title: "Titel", body: "Inhoud" },
        data: { notificationId: "n1" },
      });

      expect(handler).toHaveBeenCalledWith({
        id: "m1",
        title: "Titel",
        body: "Inhoud",
        notificationId: "n1",
        data: { notificationId: "n1" },
      });
    });

    it("falls back to default title/body and a generated id when missing", () => {
      let capturedListener!: (message: unknown) => void;
      (onMessage as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onForegroundMessage(handler);
      capturedListener({});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Paperwork Notificatie", body: "" }),
      );
    });
  });

  describe("onNotificationTapped", () => {
    it("parses the RemoteMessage from onNotificationOpenedApp", () => {
      let capturedListener!: (message: unknown) => void;
      (onNotificationOpenedApp as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onNotificationTapped(handler);
      capturedListener({
        messageId: "m2",
        notification: { title: "Tik", body: "Open" },
        data: { notificationId: "n2" },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ notificationId: "n2", title: "Tik" }),
      );
    });
  });

  describe("getInitialNotificationTap", () => {
    it("returns null when the app wasn't opened from a notification", async () => {
      (getInitialNotification as jest.Mock).mockResolvedValue(null);
      expect(await getInitialNotificationTap()).toBeNull();
    });

    it("parses the initial RemoteMessage when present", async () => {
      (getInitialNotification as jest.Mock).mockResolvedValue({
        messageId: "m3",
        notification: { title: "Quit-start", body: "Tap" },
        data: { notificationId: "n3" },
      });

      expect(await getInitialNotificationTap()).toEqual(
        expect.objectContaining({ notificationId: "n3", title: "Quit-start" }),
      );
    });
  });
});
