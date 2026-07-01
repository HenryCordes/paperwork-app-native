import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  EmailsResponse,
  EmailsQueryParams,
  EmailDetailResponse,
  EmailCreateUpdateRequest,
} from "../types/emails";
import axiosInstance from "../axiosInstance";

export class EmailsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getEmails(
    params: EmailsQueryParams = { offset: 0, limit: 10 },
  ): Promise<EmailsResponse> {
    try {
      const response = await this.axios.get<EmailsResponse>("emails", { params });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen emails");
    }
  }

  async getEmailById(id?: string): Promise<EmailDetailResponse> {
    if (!id || id === "create") {
      throw new Error("Geen geldig email ID opgegeven");
    }
    try {
      const response = await this.axios.get<EmailDetailResponse>(`email/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen email details",
      );
    }
  }

  async createOrUpdateEmail(
    data: EmailCreateUpdateRequest,
  ): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>("email", data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = data._id ? "bijwerken" : "aanmaken";
      throw new Error(
        axiosError.response?.data?.message || `Fout bij ${operation} email`,
      );
    }
  }

  async deleteEmail(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`/email/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verwijderen email",
      );
    }
  }

  async sendEmail(data: EmailCreateUpdateRequest): Promise<EmailDetailResponse> {
    try {
      const response = await this.axios.post<EmailDetailResponse>("/email/send", data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij verzenden email",
      );
    }
  }
}

export const emailsService = new EmailsService(axiosInstance);

export default emailsService;
