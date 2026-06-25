import { useQuery, UseQueryResult } from "@tanstack/react-query";

import dashboardService from "@/api/services/dashboardService";
import QueryKeys from "@/api/queryKeys";
import { DashboardStatsRequest, DashboardStatsResponse } from "@/api/types/dashboard";

export const useDashboardStats = (
  { periodType, periodPreset, startDate, endDate, year }: DashboardStatsRequest = {},
): UseQueryResult<DashboardStatsResponse, Error> => {
  const params: DashboardStatsRequest = {};
  if (periodType) params.periodType = periodType;
  if (periodPreset) params.periodPreset = periodPreset;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (year) params.year = year;

  return useQuery({
    queryKey: QueryKeys.dashboard.stats(params),
    queryFn: () => dashboardService.getDashboardStats(params),
    staleTime: 5 * 60 * 1000,
  });
};

export default useDashboardStats;
