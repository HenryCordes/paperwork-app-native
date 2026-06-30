import { DashboardStatsRequest } from "./types/dashboard";
import { ExpensesQueryParams } from "./types/expenses";
import { NotificationFilter } from "./types/notifications";

const QueryKeys = {
  auth: {
    base: ["auth"] as const,
    user: () => [...QueryKeys.auth.base, "user"] as const,
    token: () => [...QueryKeys.auth.base, "token"] as const,
    profile: () => [...QueryKeys.auth.base, "profile"] as const,
  },
  dashboard: {
    base: ["dashboard"] as const,
    stats: (params: DashboardStatsRequest) =>
      [...QueryKeys.dashboard.base, "stats", params] as const,
  },
  contacts: {
    base: ["contacts"] as const,
    list: (offset?: number) => [...QueryKeys.contacts.base, "list", offset] as const,
  },
  expenses: {
    base: ["expenses"] as const,
    list: (params: ExpensesQueryParams) => [...QueryKeys.expenses.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.expenses.base, "detail", id] as const,
  },
  notifications: {
    base: ["notifications"] as const,
    tokens: () => [...QueryKeys.notifications.base, "tokens"] as const,
    settings: () => [...QueryKeys.notifications.base, "settings"] as const,
    list: (filter?: NotificationFilter) =>
      [...QueryKeys.notifications.base, "list", filter] as const,
    unreadCount: () => [...QueryKeys.notifications.base, "unread-count"] as const,
  },
};

export default QueryKeys;
