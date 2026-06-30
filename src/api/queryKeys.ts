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
    detail: (id?: string) => [...QueryKeys.contacts.base, "detail", id] as const,
  },
  expenses: {
    base: ["expenses"] as const,
    list: (params: ExpensesQueryParams) => [...QueryKeys.expenses.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.expenses.base, "detail", id] as const,
  },
  // Phase 4b stub namespaces: each fan-out section narrows its own `params`
  // type when it ports its data layer. Left as `unknown` here so this base
  // file doesn't import not-yet-existing type modules. Profile reuses the
  // existing QueryKeys.auth.profile() key rather than a separate namespace.
  invoices: {
    base: ["invoices"] as const,
    list: (params: unknown) => [...QueryKeys.invoices.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.invoices.base, "detail", id] as const,
  },
  settings: {
    base: ["settings"] as const,
    detail: () => [...QueryKeys.settings.base, "detail"] as const,
    vatPreferences: () => [...QueryKeys.settings.base, "vat-preferences"] as const,
  },
  taxes: {
    base: ["taxes"] as const,
    periods: () => [...QueryKeys.taxes.base, "periods"] as const,
    summary: (params: unknown) => [...QueryKeys.taxes.base, "summary", params] as const,
    deadline: () => [...QueryKeys.taxes.base, "deadline"] as const,
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
