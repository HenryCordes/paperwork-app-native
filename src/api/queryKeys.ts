import { DashboardStatsRequest } from "./types/dashboard";
import { ExpensesQueryParams } from "./types/expenses";
import { InvoicesQueryParams } from "./types/invoices";
import { NotificationFilter } from "./types/notifications";
import { TaxPeriodType, TaxSummaryRequest } from "./types/taxes";

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
  invoices: {
    base: ["invoices"] as const,
    list: (params: InvoicesQueryParams) => [...QueryKeys.invoices.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.invoices.base, "detail", id] as const,
  },
  emails: {
    base: ["emails"] as const,
    list: (offset?: number) => [...QueryKeys.emails.base, "list", offset] as const,
    detail: (id?: string) => [...QueryKeys.emails.base, "detail", id] as const,
  },
  settings: {
    base: ["settings"] as const,
    detail: () => [...QueryKeys.settings.base, "detail"] as const,
    vatPreferences: () => [...QueryKeys.settings.base, "vat-preferences"] as const,
  },
  taxes: {
    base: ["taxes"] as const,
    periods: () => [...QueryKeys.taxes.base, "periods"] as const,
    summary: (params: TaxSummaryRequest) =>
      [...QueryKeys.taxes.base, "summary", params] as const,
    deadline: (periodType: TaxPeriodType) =>
      [...QueryKeys.taxes.base, "deadline", periodType] as const,
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
