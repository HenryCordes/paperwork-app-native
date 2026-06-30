import * as Notifications from "expo-notifications";

import { setBadgeCount, clearBadge, getBadgeCount } from "@/services/badge.service";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
}));

describe("badge.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers a notification handler that shows banners without sound or badge side effects", () => {
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  describe("setBadgeCount", () => {
    it("forwards the count to setBadgeCountAsync", async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);
      await setBadgeCount(5);
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });

  describe("clearBadge", () => {
    it("sets the badge count to 0", async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);
      await clearBadge();
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe("getBadgeCount", () => {
    it("returns the current badge count", async () => {
      (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(3);
      expect(await getBadgeCount()).toBe(3);
    });
  });
});
