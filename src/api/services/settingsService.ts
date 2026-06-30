import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import { SettingsResponse, SettingsUpdateRequest } from "../types/settings";
import axiosInstance from "../axiosInstance";

export class SettingsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getSettings(): Promise<SettingsResponse> {
    try {
      const response = await this.axios.get<SettingsResponse>("settings");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen instellingen");
    }
  }

  async updateSettings(settings: SettingsUpdateRequest): Promise<SettingsResponse> {
    try {
      const response = await this.axios.post<SettingsResponse>("settings", settings);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij bijwerken instellingen");
    }
  }
}

export const settingsService = new SettingsService(axiosInstance);

export default settingsService;
