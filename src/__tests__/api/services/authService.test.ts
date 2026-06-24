import { AuthService } from "@/api/services/authService";
import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";

jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  AUTH_TOKEN_KEY: "auth_token",
}));

describe("AuthService", () => {
  const mockAxios = { post: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("stores the token on success", async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          token: "abc123",
          user: { id: "1", email: "a@b.com", name: "A" },
        },
      });
      const service = new AuthService(mockAxios as never);

      const result = await service.login({
        email: "a@b.com",
        password: "pw",
      });

      expect(mockAxios.post).toHaveBeenCalledWith("auth/login", {
        email: "a@b.com",
        password: "pw",
      });
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        AUTH_TOKEN_KEY,
        "abc123"
      );
      expect(result.token).toBe("abc123");
    });

    it("throws the API's error message on failure", async () => {
      mockAxios.post.mockRejectedValue({
        response: { data: { message: "Inloggegevens onjuist" } },
      });
      const service = new AuthService(mockAxios as never);

      await expect(
        service.login({ email: "a@b.com", password: "wrong" })
      ).rejects.toThrow("Inloggegevens onjuist");
    });

    it("falls back to a generic Dutch message when the API gives none", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new AuthService(mockAxios as never);

      await expect(
        service.login({ email: "a@b.com", password: "wrong" })
      ).rejects.toThrow("Login mislukt");
    });
  });

  describe("logout", () => {
    it("removes the stored token", async () => {
      const service = new AuthService(mockAxios as never);
      await service.logout();
      expect(secureStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when a token is stored", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue("abc123");
      const service = new AuthService(mockAxios as never);
      expect(await service.isAuthenticated()).toBe(true);
    });

    it("returns false when no token is stored", async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      const service = new AuthService(mockAxios as never);
      expect(await service.isAuthenticated()).toBe(false);
    });
  });
});
