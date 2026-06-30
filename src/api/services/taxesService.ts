import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  TaxDeadlineResponse,
  TaxExportRequest,
  TaxPeriodType,
  TaxPeriodsResponse,
  TaxSummaryRequest,
  TaxSummaryResponse,
} from "../types/taxes";
import axiosInstance from "../axiosInstance";

export class TaxesService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getTaxPeriods(): Promise<TaxPeriodsResponse> {
    try {
      const response = await this.axios.get<TaxPeriodsResponse>("/btw-export/periods");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen BTW perioden",
      );
    }
  }

  async getTaxSummary(params: TaxSummaryRequest): Promise<TaxSummaryResponse> {
    try {
      const response = await this.axios.get<TaxSummaryResponse>("/btw-export/summary", {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen BTW overzicht",
      );
    }
  }

  async getNextDeadline(
    periodType: TaxPeriodType = "quarterly",
  ): Promise<TaxDeadlineResponse> {
    try {
      const response = await this.axios.get<TaxDeadlineResponse>("/btw-export/deadline", {
        params: { periodType },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen BTW deadline",
      );
    }
  }

  async exportTaxReturn(params: TaxExportRequest): Promise<string> {
    try {
      const response = await this.axios.get<string>("/btw-export/export", {
        params,
        // On RN, axios returns the body as a string regardless of responseType.
        // The source app requests `responseType: "blob"` (Capacitor/web path)
        // and then calls blobToBase64. On RN the axios-rn adapter already
        // returns a base64 string when the server sends binary, so we request
        // arraybuffer and coerce — but the simplest portable approach is to
        // just let the default response type flow through and treat the result
        // as a base64 string, which is what the mobile branch of the source
        // blobToBase64 also ends up with.
        responseType: "arraybuffer",
      });
      // Convert ArrayBuffer to base64 string for writing via expo-file-system
      const bytes = new Uint8Array(response.data as unknown as ArrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij exporteren van BTW aangifte",
      );
    }
  }
}

export const taxesService = new TaxesService(axiosInstance);

export default taxesService;
