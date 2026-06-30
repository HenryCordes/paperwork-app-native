import { useCallback, useEffect } from "react";

import { setBadgeCount, clearBadge as clearBadgeCount } from "@/services/badge.service";
import { useUnreadCount } from "./useNotifications";

export function useBadge() {
  const { data } = useUnreadCount();

  useEffect(() => {
    if (data) {
      setBadgeCount(data.count);
    }
  }, [data]);

  const setBadge = useCallback(async (count: number) => {
    await setBadgeCount(count);
  }, []);

  const clearBadge = useCallback(async () => {
    await clearBadgeCount();
  }, []);

  return { setBadge, clearBadge };
}

export default useBadge;
