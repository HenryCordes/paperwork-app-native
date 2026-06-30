import * as Notifications from "expo-notifications";

// Without a handler registered, expo-notifications' documented default is
// not to show a notification at all - this also governs the local
// notification firebase-messaging's foreground listener schedules, not
// just badge-related ones, so it lives here as the expo-notifications
// "owner" module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}
