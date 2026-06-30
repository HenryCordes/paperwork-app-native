import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import { ContactsQueryParams, ContactsResponse } from "../types/contacts";
import axiosInstance from "../axiosInstance";

export class ContactsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async getContacts(
    params: ContactsQueryParams = { offset: 0 },
  ): Promise<ContactsResponse> {
    try {
      const response = await this.axios.get<ContactsResponse>(
        `contacts?offset=${params.offset}`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen contacten");
    }
  }
}

export const contactsService = new ContactsService(axiosInstance);

export default contactsService;
