import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import { Contact, ContactCreateUpdateRequest, ContactsQueryParams, ContactsResponse } from "../types/contacts";
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

  async getContactById(id?: string): Promise<{ success: boolean; data: Contact }> {
    if (!id || id === "create") {
      throw new Error("Geen geldig contact ID opgegeven");
    }

    try {
      const response = await this.axios.get<{ success: boolean; data: Contact }>(`contact/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen contact details");
    }
  }

  async createOrUpdateContact(
    contactData: ContactCreateUpdateRequest,
  ): Promise<{ success: boolean; data: Contact }> {
    try {
      const response = await this.axios.post<{ success: boolean; data: Contact }>(
        "contact",
        contactData,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const operation = contactData._id ? "bijwerken" : "aanmaken";
      throw new Error(axiosError.response?.data?.message || `Fout bij ${operation} contact`);
    }
  }

  async deleteContact(id: string): Promise<{ success: boolean }> {
    try {
      await this.axios.delete(`contact/${id}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen contact");
    }
  }
}

export const contactsService = new ContactsService(axiosInstance);

export default contactsService;
