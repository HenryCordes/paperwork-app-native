import { SettingsService } from "@/api/services/settingsService";
import type { SettingsUpdateRequest } from "@/api/types/settings";

describe("SettingsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("fetches settings from the settings endpoint", async () => {
      const response = { success: true, data: { companyName: "Acme BV" } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new SettingsService(mockAxios as never);

      const result = await service.getSettings();

      expect(mockAxios.get).toHaveBeenCalledWith("settings");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new SettingsService(mockAxios as never);

      await expect(service.getSettings()).rejects.toThrow("Fout bij ophalen instellingen");
    });
  });

  describe("updateSettings", () => {
    it("posts the updated data to the settings endpoint", async () => {
      const update: SettingsUpdateRequest = { companyName: "Acme BV Nieuw" };
      const response = { success: true, data: { companyName: "Acme BV Nieuw" } };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new SettingsService(mockAxios as never);

      const result = await service.updateSettings(update);

      expect(mockAxios.post).toHaveBeenCalledWith("settings", update);
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new SettingsService(mockAxios as never);

      await expect(service.updateSettings({ companyName: "X" })).rejects.toThrow(
        "Fout bij bijwerken instellingen",
      );
    });
  });
});
