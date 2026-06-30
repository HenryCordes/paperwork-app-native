import { AuthService } from "@/api/services/authService";
import { secureStorage, AUTH_TOKEN_KEY } from "@/services/secureStorage";
import type { UserProfile } from "@/api/types";

jest.mock("@/services/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  AUTH_TOKEN_KEY: "auth_token",
}));

describe("AuthService.getProfile", () => {
  const mockAxios = { post: jest.fn(), get: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const profile: UserProfile = {
    _id: "u1",
    name: "Jane Doe",
    companyName: "Acme BV",
    email: "jane@acme.nl",
    role: "admin",
    organization: "org-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    __v: 0,
  };

  it("returns the profile data on success", async () => {
    mockAxios.get.mockResolvedValue({
      data: { success: true, data: profile },
    });
    const service = new AuthService(mockAxios as never);

    const result = await service.getProfile();

    expect(mockAxios.get).toHaveBeenCalledWith("auth/profile");
    expect(result).toEqual(profile);
  });

  it("throws the API's error message on failure", async () => {
    mockAxios.get.mockRejectedValue({
      response: { data: { message: "Geen toegang" } },
    });
    const service = new AuthService(mockAxios as never);

    await expect(service.getProfile()).rejects.toThrow("Geen toegang");
  });

  it("falls back to a generic Dutch message when the API gives none", async () => {
    mockAxios.get.mockRejectedValue(new Error("network down"));
    const service = new AuthService(mockAxios as never);

    await expect(service.getProfile()).rejects.toThrow(
      "Kon profielgegevens niet ophalen"
    );
  });
});
