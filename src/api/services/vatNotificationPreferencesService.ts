import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  VatNotificationPreferencesResponse,
  VatNotificationPreferencesUpdateRequest,
} from "../types/vatNotificationPreferences";
import axiosInstance from "../axiosInstance";

export class VatNotificationPreferencesService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getPreferences(): Promise<VatNotificationPreferencesResponse> {
    try {
      const response = await this.axios.get<VatNotificationPreferencesResponse>(
        "vat-return-notifications/preferences",
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen BTW-notificatievoorkeuren",
      );
    }
  }

  async updatePreferences(
    data: VatNotificationPreferencesUpdateRequest,
  ): Promise<VatNotificationPreferencesResponse> {
    try {
      const response = await this.axios.put<VatNotificationPreferencesResponse>(
        "vat-return-notifications/preferences",
        data,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij bijwerken BTW-notificatievoorkeuren",
      );
    }
  }
}

export const vatNotificationPreferencesService = new VatNotificationPreferencesService(
  axiosInstance,
);

export default vatNotificationPreferencesService;
