import { ContactsService } from "@/api/services/contactsService";
import type { ContactCreateUpdateRequest } from "@/api/types/contacts";

describe("ContactsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeContactData = (overrides: Partial<ContactCreateUpdateRequest> = {}): ContactCreateUpdateRequest => ({
    companyName: "Acme",
    typeOfContact: "Klant",
    typeName: "Bedrijf",
    lastName: "Jansen",
    firstName: "Piet",
    initials: "P",
    emailAddress: "piet@acme.nl",
    ...overrides,
  });

  describe("getContacts", () => {
    it("defaults to offset 0 and returns the resolved data", async () => {
      const response = { success: true, data: { docs: [{ _id: "1", companyName: "Acme" }] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ContactsService(mockAxios as never);

      const result = await service.getContacts();

      expect(mockAxios.get).toHaveBeenCalledWith("contacts?offset=0");
      expect(result).toEqual(response);
    });

    it("forwards an explicit offset into the query string", async () => {
      mockAxios.get.mockResolvedValue({ data: { success: true, data: { docs: [] } } });
      const service = new ContactsService(mockAxios as never);

      await service.getContacts({ offset: 20 });

      expect(mockAxios.get).toHaveBeenCalledWith("contacts?offset=20");
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

  describe("getContactById", () => {
    it("throws without calling axios when id is undefined", async () => {
      const service = new ContactsService(mockAxios as never);

      await expect(service.getContactById(undefined)).rejects.toThrow(
        "Geen geldig contact ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('throws without calling axios when id is "create"', async () => {
      const service = new ContactsService(mockAxios as never);

      await expect(service.getContactById("create")).rejects.toThrow(
        "Geen geldig contact ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it("fetches the contact detail for a real id", async () => {
      const response = { success: true, data: makeContactData() };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new ContactsService(mockAxios as never);

      const result = await service.getContactById("c1");

      expect(mockAxios.get).toHaveBeenCalledWith("contact/c1");
      expect(result).toEqual(response);
    });

    it("falls back to a Dutch message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new ContactsService(mockAxios as never);

      await expect(service.getContactById("c1")).rejects.toThrow(
        "Fout bij ophalen contact details",
      );
    });
  });

  describe("createOrUpdateContact", () => {
    it("posts to the combined endpoint and returns the result", async () => {
      const response = { success: true, data: makeContactData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new ContactsService(mockAxios as never);
      const data = makeContactData();

      const result = await service.createOrUpdateContact(data);

      expect(mockAxios.post).toHaveBeenCalledWith("contact", data);
      expect(result).toEqual(response);
    });

    it('falls back to a Dutch "aanmaken" message when _id is absent', async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new ContactsService(mockAxios as never);

      await expect(service.createOrUpdateContact(makeContactData())).rejects.toThrow(
        "Fout bij aanmaken contact",
      );
    });

    it('falls back to a Dutch "bijwerken" message when _id is present', async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new ContactsService(mockAxios as never);

      await expect(
        service.createOrUpdateContact(makeContactData({ _id: "c1" })),
      ).rejects.toThrow("Fout bij bijwerken contact");
    });
  });

  describe("deleteContact", () => {
    it("calls DELETE on the contact endpoint", async () => {
      mockAxios.delete.mockResolvedValue({});
      const service = new ContactsService(mockAxios as never);

      const result = await service.deleteContact("c1");

      expect(mockAxios.delete).toHaveBeenCalledWith("contact/c1");
      expect(result).toEqual({ success: true });
    });

    it("falls back to a Dutch message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new ContactsService(mockAxios as never);

      await expect(service.deleteContact("c1")).rejects.toThrow(
        "Fout bij verwijderen contact",
      );
    });
  });
});
