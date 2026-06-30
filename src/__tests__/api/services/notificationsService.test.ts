import { NotificationsService } from "@/api/services/notificationsService";

describe("NotificationsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerToken", () => {
    it("posts the token and platform to the register endpoint", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.registerToken({ token: "t1", platform: "ios" });

      expect(mockAxios.post).toHaveBeenCalledWith("notifications/register-token", {
        token: "t1",
        platform: "ios",
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.registerToken({ token: "t1", platform: "ios" })).rejects.toThrow(
        "Fout bij registreren push-token",
      );
    });
  });

  describe("removeToken", () => {
    it("sends a DELETE with the token in the request body", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.delete.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.removeToken("t1");

      expect(mockAxios.delete).toHaveBeenCalledWith("notifications/remove-token", {
        data: { token: "t1" },
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.removeToken("t1")).rejects.toThrow("Fout bij verwijderen push-token");
    });
  });

  describe("updateSettings", () => {
    it("puts the settings to the settings endpoint", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.updateSettings({ enabled: true });

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/settings", { enabled: true });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.updateSettings({ enabled: true })).rejects.toThrow(
        "Fout bij bijwerken notificatie-instellingen",
      );
    });
  });

  describe("getTokens", () => {
    it("fetches the user's tokens", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.getTokens();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications/tokens");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getTokens()).rejects.toThrow("Fout bij ophalen push-tokens");
    });
  });

  describe("getNotifications", () => {
    it("forwards status and type filters as params", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.getNotifications({ status: "unread", type: "expense" });

      expect(mockAxios.get).toHaveBeenCalledWith("notifications", {
        params: { status: "unread", type: "expense" },
      });
    });

    it("sends empty params when no filter is given", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.getNotifications();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications", { params: {} });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getNotifications()).rejects.toThrow("Fout bij ophalen notificaties");
    });
  });

  describe("markAsRead", () => {
    it("defaults read to true", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.markAsRead("n1");

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/read", { read: true });
    });

    it("forwards an explicit read value", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.markAsRead("n1", false);

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/read", { read: false });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAsRead("n1")).rejects.toThrow(
        "Fout bij markeren van notificatie als gelezen",
      );
    });
  });

  describe("markAllAsRead", () => {
    it("puts to the mark-all-read endpoint", async () => {
      const response = { success: true, count: 3 };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.markAllAsRead();

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/mark-all-read");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAllAsRead()).rejects.toThrow(
        "Fout bij markeren van alle notificaties als gelezen",
      );
    });
  });

  describe("deleteNotification", () => {
    it("sends DELETE to the notification's own endpoint", async () => {
      const response = { success: true };
      mockAxios.delete.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.deleteNotification("n1");

      expect(mockAxios.delete).toHaveBeenCalledWith("notifications/n1");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.deleteNotification("n1")).rejects.toThrow(
        "Fout bij verwijderen notificatie",
      );
    });
  });

  describe("getUnreadCount", () => {
    it("fetches the unread count", async () => {
      const response = { success: true, count: 2 };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.getUnreadCount();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications/unread-count");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getUnreadCount()).rejects.toThrow(
        "Fout bij ophalen aantal ongelezen notificaties",
      );
    });
  });

  describe("markAsReceived", () => {
    it("puts to the notification's received endpoint", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.markAsReceived("n1");

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/received");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAsReceived("n1")).rejects.toThrow(
        "Fout bij markeren van notificatie als ontvangen",
      );
    });
  });
});
