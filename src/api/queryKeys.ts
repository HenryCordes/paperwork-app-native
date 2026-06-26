import { DashboardStatsRequest } from "./types/dashboard";
import { ExpensesQueryParams } from "./types/expenses";

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
    list: () => [...QueryKeys.contacts.base, "list"] as const,
  },
  expenses: {
    base: ["expenses"] as const,
    list: (params: ExpensesQueryParams) => [...QueryKeys.expenses.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.expenses.base, "detail", id] as const,
  },
};

export default QueryKeys;
