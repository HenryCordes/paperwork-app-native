import axios, { InternalAxiosRequestConfig } from "axios";

import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";

export async function attachAuthToken(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  try {
    const token = await secureStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore access can fail transiently (e.g. a keychain/keystore
    // error) - proceed unauthenticated rather than failing every request,
    // authenticated or not, on a storage hiccup.
  }
  return config;
}

const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use(attachAuthToken);

export default axiosInstance;
