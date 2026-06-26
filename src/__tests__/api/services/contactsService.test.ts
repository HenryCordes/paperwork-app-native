import { ContactsService } from "@/api/services/contactsService";

describe("ContactsService", () => {
  const mockAxios = { get: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getContacts", () => {
    it("calls the contacts endpoint and returns the resolved data", async () => {
      const response = { success: true, data: { docs: [{ _id: "1", companyName: "Acme" }] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ContactsService(mockAxios as never);

      const result = await service.getContacts();

      expect(mockAxios.get).toHaveBeenCalledWith("contacts");
      expect(result).toEqual(response);
    });

    it("throws the API's error message on failure", async () => {
      mockAxios.get.mockRejectedValue({
        response: { data: { message: "Geen toegang tot contacten" } },
      });
      const service = new ContactsService(mockAxios as never);

      await expect(service.getContacts()).rejects.toThrow("Geen toegang tot contacten");
    });

    it("falls back to a generic Dutch message when the API gives none", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new ContactsService(mockAxios as never);

      await expect(service.getContacts()).rejects.toThrow("Fout bij ophalen contacten");
    });
  });
});
