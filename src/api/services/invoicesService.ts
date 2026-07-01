import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  InvoicesResponse,
  InvoicesQueryParams,
  InvoiceDetailResponse,
  InvoiceCreateUpdateRequest,
} from "../types/invoices";
import axiosInstance from "../axiosInstance";

export class InvoicesService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getInvoices(
    params: InvoicesQueryParams = { offset: 0, limit: 10 },
  ): Promise<InvoicesResponse> {
    try {
      const { offset = 0, limit = 10 } = params;
      const response = await this.axios.get<InvoicesResponse>(
        `invoices?offset=${offset}&limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen facturen");
    }
  }

  async getInvoiceById(id: string): Promise<InvoiceDetailResponse> {
    if (!id || id === "create") {
      throw new Error("Geen geldig factuur ID opgegeven");
    }

    try {
      const response = await this.axios.get<InvoiceDetailResponse>(`invoice/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen factuur");
    }
  }

  async createOrUpdateInvoice(
    data: InvoiceCreateUpdateRequest,
  ): Promise<InvoiceDetailResponse> {
    try {
      const response = await this.axios.post<InvoiceDetailResponse>("invoice", data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij opslaan factuur");
    }
  }

  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`invoices/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen factuur");
    }
  }
}

export const invoicesService = new InvoicesService(axiosInstance);

export default invoicesService;
