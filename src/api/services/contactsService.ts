import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import { ContactsResponse } from "../types/contacts";
import axiosInstance from "../axiosInstance";

export class ContactsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getContacts(): Promise<ContactsResponse> {
    try {
      const response = await this.axios.get<ContactsResponse>("contacts");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen contacten");
    }
  }
}

export const contactsService = new ContactsService(axiosInstance);

export default contactsService;
