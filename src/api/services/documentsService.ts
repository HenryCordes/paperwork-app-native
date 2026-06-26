import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import axiosInstance from "../axiosInstance";

interface DocumentUploadResponse {
  success: boolean;
  data: {
    fileLocation: string;
  };
}

interface ReceiptFile {
  uri: string;
  name: string;
  type: string;
}

export class DocumentsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async uploadReceiptDocument(file: ReceiptFile): Promise<string> {
    try {
      const formData = new FormData();
      // RN's FormData accepts {uri, name, type} at runtime; the DOM lib types
      // this repo compiles against only know about Blob/string.
      formData.append("file", file as unknown as Blob);

      const response = await this.axios.post<DocumentUploadResponse>("document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.success && response.data.data.fileLocation) {
        return response.data.data.fileLocation;
      }

      throw new Error("Document upload response is invalid");
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Failed to upload document");
    }
  }
}

export const documentsService = new DocumentsService(axiosInstance);

export default documentsService;
