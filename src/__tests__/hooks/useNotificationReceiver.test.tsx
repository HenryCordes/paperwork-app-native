import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useNotificationReceiver } from "@/hooks/useNotificationReceiver";
import {
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";
import { useMarkAsReceived, useMarkAsRead } from "@/hooks/useNotifications";

jest.mock("@/services/firebase-messaging.service", () => ({
  onForegroundMessage: jest.fn(() => jest.fn()),
  onNotificationTapped: jest.fn(() => jest.fn()),
  getInitialNotificationTap: jest.fn(),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useMarkAsReceived: jest.fn(),
  useMarkAsRead: jest.fn(),
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(callback, { wrapper });
}

describe("useNotificationReceiver", () => {
  const markAsReceived = jest.fn();
  const markAsRead = jest.fn();

  beforeEach(() => {
    (useMarkAsReceived as jest.Mock).mockReturnValue({ mutate: markAsReceived });
    (useMarkAsRead as jest.Mock).mockReturnValue({ mutate: markAsRead });
    (getInitialNotificationTap as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("marks a notification as received when a foreground message arrives", () => {
    let receivedHandler!: (payload: { notificationId?: string }) => void;
    (onForegroundMessage as jest.Mock).mockImplementation((handler) => {
      receivedHandler = handler;
      return jest.fn();
    });

    renderWithClient(() => useNotificationReceiver());
    receivedHandler({ notificationId: "n1" });

    expect(markAsReceived).toHaveBeenCalledWith("n1");
  });

  it("marks a notification as read when it is tapped", () => {
    let tapHandler!: (payload: { notificationId?: string }) => void;
    (onNotificationTapped as jest.Mock).mockImplementation((handler) => {
      tapHandler = handler;
      return jest.fn();
    });

    renderWithClient(() => useNotificationReceiver());
    tapHandler({ notificationId: "n2" });

    expect(markAsRead).toHaveBeenCalledWith({ notificationId: "n2", read: true });
  });

  it("marks a notification as read for a cold-start tap from a quit state", async () => {
    (getInitialNotificationTap as jest.Mock).mockResolvedValue({
      id: "m3",
      title: "Quit-start",
      body: "Tap",
      notificationId: "n3",
    });

    renderWithClient(() => useNotificationReceiver());

    await waitFor(() =>
      expect(markAsRead).toHaveBeenCalledWith({ notificationId: "n3", read: true }),
    );
  });

  it("unsubscribes both listeners on unmount", () => {
    const unsubscribeMessage = jest.fn();
    const unsubscribeTap = jest.fn();
    (onForegroundMessage as jest.Mock).mockReturnValue(unsubscribeMessage);
    (onNotificationTapped as jest.Mock).mockReturnValue(unsubscribeTap);

    const { unmount } = renderWithClient(() => useNotificationReceiver());
    unmount();

    expect(unsubscribeMessage).toHaveBeenCalled();
    expect(unsubscribeTap).toHaveBeenCalled();
  });
});
