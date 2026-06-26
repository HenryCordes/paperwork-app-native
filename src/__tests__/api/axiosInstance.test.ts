import { InternalAxiosRequestConfig } from "axios";

import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";
import { attachAuthToken } from "@/api/axiosInstance";

jest.mock("@/services/secureStorage", () => ({
  secureStorage: { getItem: jest.fn() },
  AUTH_TOKEN_KEY: "auth_token",
}));

function makeConfig(): InternalAxiosRequestConfig {
  return { headers: {} } as InternalAxiosRequestConfig;
}

describe("attachAuthToken", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("attaches a Bearer Authorization header when a token is stored", async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue("abc123");

    const config = await attachAuthToken(makeConfig());

    expect(secureStorage.getItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    expect(config.headers.Authorization).toBe("Bearer abc123");
  });

  it("does not attach an Authorization header when no token is stored", async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);

    const config = await attachAuthToken(makeConfig());

    expect(config.headers.Authorization).toBeUndefined();
  });

  // Bug risk, flagged in code review: SecureStore.getItemAsync can reject on
  // a real device (e.g. a transient keychain/keystore access error). Since
  // this interceptor runs on every request, an unhandled rejection here
  // would fail every API call, not just authenticated ones.
  it("proceeds without a token when secureStorage.getItem rejects", async () => {
    (secureStorage.getItem as jest.Mock).mockRejectedValue(new Error("keychain error"));

    const config = await attachAuthToken(makeConfig());

    expect(config.headers.Authorization).toBeUndefined();
  });
});
