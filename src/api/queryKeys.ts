import { DashboardStatsRequest } from "./types/dashboard";

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
};

export default QueryKeys;
