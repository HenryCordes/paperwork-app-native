import { VatNotificationPreferencesService } from "@/api/services/vatNotificationPreferencesService";
import type { VatNotificationPreferencesUpdateRequest } from "@/api/types/vatNotificationPreferences";

describe("VatNotificationPreferencesService", () => {
  const mockAxios = { get: jest.fn(), put: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getPreferences", () => {
    it("fetches preferences from the vat-return-notifications/preferences endpoint", async () => {
      const response = { success: true, data: { emailNotifications: true } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new VatNotificationPreferencesService(mockAxios as never);

      const result = await service.getPreferences();

      expect(mockAxios.get).toHaveBeenCalledWith("vat-return-notifications/preferences");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new VatNotificationPreferencesService(mockAxios as never);

      await expect(service.getPreferences()).rejects.toThrow(
        "Fout bij ophalen BTW-notificatievoorkeuren",
      );
    });
  });

  describe("updatePreferences", () => {
    it("puts the updated data to the vat-return-notifications/preferences endpoint", async () => {
      const update: VatNotificationPreferencesUpdateRequest = { emailNotifications: false };
      const response = { success: true, data: { emailNotifications: false } };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new VatNotificationPreferencesService(mockAxios as never);

      const result = await service.updatePreferences(update);

      expect(mockAxios.put).toHaveBeenCalledWith("vat-return-notifications/preferences", update);
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new VatNotificationPreferencesService(mockAxios as never);

      await expect(service.updatePreferences({ emailNotifications: false })).rejects.toThrow(
        "Fout bij bijwerken BTW-notificatievoorkeuren",
      );
    });
  });
});
