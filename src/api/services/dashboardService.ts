import axiosInstance from "../axiosInstance";
import { DashboardStatsRequest, DashboardStatsResponse } from "../types/dashboard";

const dashboardService = {
  getDashboardStats: async (
    params: DashboardStatsRequest,
  ): Promise<DashboardStatsResponse> => {
    const response = await axiosInstance.get<DashboardStatsResponse>(
      "/dashboard/stats",
      { params },
    );
    return response.data;
  },
};

export default dashboardService;
