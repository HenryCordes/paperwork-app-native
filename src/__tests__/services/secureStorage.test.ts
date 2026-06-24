import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { secureStorage } from "@/services/secureStorage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secureStorage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reads via SecureStore on native platforms", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-value");
    const result = await secureStorage.getItem("some_key");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("some_key");
    expect(result).toBe("stored-value");
  });

  it("writes via SecureStore on native platforms", async () => {
    await secureStorage.setItem("some_key", "some_value");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "some_key",
      "some_value"
    );
  });

  it("removes via SecureStore on native platforms", async () => {
    await secureStorage.removeItem("some_key");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("some_key");
  });

  it("falls back to localStorage on web", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const store: Record<string, string> = {};
    (global as { localStorage?: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as unknown as Storage;

    await secureStorage.setItem("web_key", "web_value");
    expect(await secureStorage.getItem("web_key")).toBe("web_value");
    await secureStorage.removeItem("web_key");
    expect(await secureStorage.getItem("web_key")).toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
  });
});
