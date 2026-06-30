import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  FCMTokenRequest,
  FCMTokenResponse,
  NotificationSettingsRequest,
  NotificationSettingsResponse,
  GetTokensResponse,
  NotificationListResponse,
  NotificationFilter,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "../types/notifications";
import axiosInstance from "../axiosInstance";

export class NotificationsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async registerToken(tokenData: FCMTokenRequest): Promise<FCMTokenResponse> {
    try {
      const response = await this.axios.post<FCMTokenResponse>(
        "notifications/register-token",
        tokenData,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij registreren push-token");
    }
  }

  async removeToken(token: string): Promise<FCMTokenResponse> {
    try {
      const response = await this.axios.delete<FCMTokenResponse>("notifications/remove-token", {
        data: { token },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen push-token");
    }
  }

  async updateSettings(
    settings: NotificationSettingsRequest,
  ): Promise<NotificationSettingsResponse> {
    try {
      const response = await this.axios.put<NotificationSettingsResponse>(
        "notifications/settings",
        settings,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij bijwerken notificatie-instellingen",
      );
    }
  }

  async getTokens(): Promise<GetTokensResponse> {
    try {
      const response = await this.axios.get<GetTokensResponse>("notifications/tokens");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen push-tokens");
    }
  }

  async getNotifications(filter?: NotificationFilter): Promise<NotificationListResponse> {
    try {
      const params: Record<string, string> = {};
      if (filter?.status) {
        params.status = filter.status;
      }
      if (filter?.type) {
        params.type = filter.type;
      }
      const response = await this.axios.get<NotificationListResponse>("notifications", {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen notificaties");
    }
  }

  async markAsRead(notificationId: string, read: boolean = true): Promise<MarkAsReadResponse> {
    try {
      const response = await this.axios.put<MarkAsReadResponse>(
        `notifications/${notificationId}/read`,
        { read },
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij markeren van notificatie als gelezen",
      );
    }
  }

  async markAllAsRead(): Promise<MarkAllReadResponse> {
    try {
      const response = await this.axios.put<MarkAllReadResponse>("notifications/mark-all-read");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Fout bij markeren van alle notificaties als gelezen",
      );
    }
  }

  async deleteNotification(notificationId: string): Promise<DeleteNotificationResponse> {
    try {
      const response = await this.axios.delete<DeleteNotificationResponse>(
        `notifications/${notificationId}`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen notificatie");
    }
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await this.axios.get<UnreadCountResponse>("notifications/unread-count");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen aantal ongelezen notificaties",
      );
    }
  }

  async markAsReceived(notificationId: string): Promise<MarkAsReadResponse> {
    try {
      const response = await this.axios.put<MarkAsReadResponse>(
        `notifications/${notificationId}/received`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij markeren van notificatie als ontvangen",
      );
    }
  }
}

export const notificationsService = new NotificationsService(axiosInstance);

export default notificationsService;
