import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useNotificationTokens,
  useNotificationSettings,
  useNotificationsList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useMarkAsReceived,
} from "@/hooks/useNotifications";
import notificationsService from "@/api/services/notificationsService";
import QueryKeys from "@/api/queryKeys";

jest.mock("@/api/services/notificationsService", () => ({
  __esModule: true,
  default: {
    getTokens: jest.fn(),
    registerToken: jest.fn(),
    removeToken: jest.fn(),
    updateSettings: jest.fn(),
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    markAsReceived: jest.fn(),
  },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

describe("useNotificationTokens", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the tokens the service resolves", async () => {
    const response = { success: true, data: [{ platform: "ios", createdAt: "x", lastUsed: "y" }] };
    (notificationsService.getTokens as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useNotificationTokens());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toEqual(response.data);
  });

  it("registers a token and invalidates the tokens query on success", async () => {
    (notificationsService.getTokens as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (notificationsService.registerToken as jest.Mock).mockResolvedValue({
      success: true,
      message: "ok",
    });

    const { result, client } = renderWithClient(() => useNotificationTokens());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.registerToken({ token: "t1", platform: "ios" });
    });

    await waitFor(() =>
      expect(notificationsService.registerToken).toHaveBeenCalledWith({
        token: "t1",
        platform: "ios",
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.tokens() });
  });
});

describe("useNotificationSettings", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the new settings on update", async () => {
    (notificationsService.updateSettings as jest.Mock).mockResolvedValue({
      success: true,
      message: "ok",
    });

    const { result } = renderWithClient(() => useNotificationSettings());

    act(() => {
      result.current.updateSettings({ enabled: true });
    });

    await waitFor(() =>
      expect(notificationsService.updateSettings).toHaveBeenCalledWith({ enabled: true }),
    );
  });
});

describe("useNotificationsList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses QueryKeys.notifications.list(filter) as the real runtime query key", async () => {
    const response = { success: true, data: [] };
    (notificationsService.getNotifications as jest.Mock).mockResolvedValue(response);
    const filter = { status: "unread" as const };

    const { result, client } = renderWithClient(() => useNotificationsList(filter));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const queries = client.getQueryCache().getAll();
    expect(queries[0].queryKey).toEqual(QueryKeys.notifications.list(filter));
  });
});

describe("useUnreadCount", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the unread count the service resolves", async () => {
    (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue({
      success: true,
      count: 4,
    });

    const { result } = renderWithClient(() => useUnreadCount());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true, count: 4 });
  });
});

describe("useMarkAsRead", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with notificationId and read, then invalidates the base key", async () => {
    (notificationsService.markAsRead as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useMarkAsRead());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate({ notificationId: "n1", read: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAsRead).toHaveBeenCalledWith("n1", true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});

describe("useMarkAllAsRead", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with no argument and invalidates the base key", async () => {
    (notificationsService.markAllAsRead as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useMarkAllAsRead());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAllAsRead).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});

describe("useDeleteNotification", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the notificationId and invalidates the base key", async () => {
    (notificationsService.deleteNotification as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useDeleteNotification());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("n1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.deleteNotification).toHaveBeenCalledWith("n1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});

describe("useMarkAsReceived", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the notificationId and invalidates the base key", async () => {
    (notificationsService.markAsReceived as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useMarkAsReceived());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("n1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAsReceived).toHaveBeenCalledWith("n1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});
