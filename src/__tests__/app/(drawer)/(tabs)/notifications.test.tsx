import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Notifications from "@/app/(drawer)/(tabs)/notifications";
import {
  useNotificationsList,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import QueryKeys from "@/api/queryKeys";
import type { StoredNotification } from "@/api/types/notifications";

jest.mock("@/hooks/useNotifications");

const mockMarkAsReadMutate = jest.fn();
const mockMarkAllAsReadMutate = jest.fn();
const mockDeleteNotificationMutate = jest.fn();

function renderScreen() {
  const client = new QueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <Notifications />
    </QueryClientProvider>,
  );
  return { ...result, client };
}

function makeNotification(overrides: Partial<StoredNotification> = {}): StoredNotification {
  return {
    _id: "n1",
    title: "Test notificatie",
    body: "Dit is een testbericht",
    type: "general",
    read: false,
    received: true,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockNotificationsList(overrides: Partial<ReturnType<typeof useNotificationsList>>) {
  (useNotificationsList as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  });
}

describe("Notifications List screen", () => {
  beforeEach(() => {
    (useMarkAsRead as jest.Mock).mockReturnValue({ mutate: mockMarkAsReadMutate });
    (useMarkAllAsRead as jest.Mock).mockReturnValue({ mutate: mockMarkAllAsReadMutate });
    (useDeleteNotification as jest.Mock).mockReturnValue({ mutate: mockDeleteNotificationMutate });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders a card per notification with title, body, and relative time", () => {
    mockNotificationsList({
      data: { success: true, data: [makeNotification()] },
    });

    const { getByText } = renderScreen();

    expect(getByText("Test notificatie")).toBeTruthy();
    expect(getByText("Dit is een testbericht")).toBeTruthy();
    // 5 minutes ago — formatDate should produce something like "5m geleden"
    expect(getByText(/geleden/)).toBeTruthy();
  });

  it("renders unread notifications with the unread testID", () => {
    mockNotificationsList({
      data: {
        success: true,
        data: [
          makeNotification({ _id: "n1", read: false }),
          makeNotification({ _id: "n2", read: true, title: "Gelezen" }),
        ],
      },
    });

    const { getAllByTestId, queryAllByTestId } = renderScreen();

    // unread indicator should appear only for the unread notification
    expect(getAllByTestId("notification-unread-indicator")).toHaveLength(1);
    // read notification should not have the unread indicator
    expect(queryAllByTestId("notification-unread-indicator")).toHaveLength(1);
  });

  it("shows the Dutch empty state when there are no notifications", () => {
    mockNotificationsList({
      data: { success: true, data: [] },
    });

    const { getByText } = renderScreen();

    expect(getByText("Geen notificaties")).toBeTruthy();
  });

  it("shows a Dutch error message when the query fails", () => {
    mockNotificationsList({ isError: true, error: new Error("netwerk fout") });

    const { getByText } = renderScreen();

    expect(getByText(/netwerk fout/)).toBeTruthy();
  });

  it("calls useMarkAsRead().mutate with the right args when the mark-read action is pressed", () => {
    const notification = makeNotification({ _id: "n42", read: false });
    mockNotificationsList({
      data: { success: true, data: [notification] },
    });

    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("notification-mark-read-n42"));

    expect(mockMarkAsReadMutate).toHaveBeenCalledWith({ notificationId: "n42", read: true });
  });

  it("toggles a read notification back to unread when its action is pressed", () => {
    const notification = makeNotification({ _id: "n43", read: true });
    mockNotificationsList({
      data: { success: true, data: [notification] },
    });

    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("notification-mark-read-n43"));

    expect(mockMarkAsReadMutate).toHaveBeenCalledWith({ notificationId: "n43", read: false });
  });

  it("calls useDeleteNotification().mutate with the id when the delete action is pressed", () => {
    const notification = makeNotification({ _id: "n99", read: false });
    mockNotificationsList({
      data: { success: true, data: [notification] },
    });

    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("notification-delete-n99"));

    expect(mockDeleteNotificationMutate).toHaveBeenCalledWith("n99");
  });

  it("calls useMarkAllAsRead().mutate when the mark-all-read header action is pressed", () => {
    mockNotificationsList({
      data: { success: true, data: [makeNotification()] },
    });

    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId("notifications-mark-all-read"));

    expect(mockMarkAllAsReadMutate).toHaveBeenCalled();
  });

  it("invalidates the notifications query when pulled to refresh", async () => {
    mockNotificationsList({
      data: { success: true, data: [makeNotification()] },
    });

    const { getByTestId, client } = renderScreen();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    fireEvent(getByTestId("notifications-list"), "refresh");

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base }),
    );
  });
});
