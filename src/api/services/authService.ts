import { AxiosError, AxiosInstance } from "axios";

import { ApiError, LoginRequest, LoginResponse } from "../types";
import axiosInstance from "../axiosInstance";
import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";

export class AuthService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.axios.post<LoginResponse>(
        "auth/login",
        credentials
      );

      if (response.data.token) {
        await secureStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage =
        axiosError.response?.data?.message || "Login mislukt";
      throw new Error(errorMessage);
    }
  }

  async logout(): Promise<void> {
    await secureStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await secureStorage.getItem(AUTH_TOKEN_KEY);
    return token !== null;
  }
}

export const authService = new AuthService(axiosInstance);

export default authService;
