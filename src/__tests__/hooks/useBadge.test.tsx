import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useBadge } from "@/hooks/useBadge";
import { setBadgeCount } from "@/services/badge.service";
import { useUnreadCount } from "@/hooks/useNotifications";

jest.mock("@/services/badge.service", () => ({
  setBadgeCount: jest.fn(),
  clearBadge: jest.fn(),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: jest.fn(),
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(callback, { wrapper });
}

describe("useBadge", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("syncs the OS badge count whenever the unread count changes", async () => {
    (useUnreadCount as jest.Mock).mockReturnValue({
      data: { success: true, count: 4 },
    });

    renderWithClient(() => useBadge());

    await waitFor(() => expect(setBadgeCount).toHaveBeenCalledWith(4));
  });

  it("does not sync the badge while the unread count hasn't loaded yet", () => {
    (useUnreadCount as jest.Mock).mockReturnValue({ data: undefined });

    renderWithClient(() => useBadge());

    expect(setBadgeCount).not.toHaveBeenCalled();
  });
});
