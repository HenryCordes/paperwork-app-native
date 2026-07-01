import { EmailsService } from "@/api/services/emailsService";
import { EmailCreateUpdateRequest } from "@/api/types/emails";

describe("EmailsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  afterEach(() => jest.clearAllMocks());

  const makeEmailData = (
    overrides: Partial<EmailCreateUpdateRequest> = {},
  ): EmailCreateUpdateRequest => ({
    send: false,
    emailDate: "2026-01-01",
    subject: "Onderwerp",
    body: "<p>Hoi</p>",
    contactId: "c1",
    contactName: "Acme BV",
    contactEmail: "a@b.nl",
    emailNumber: 42,
    ...overrides,
  });

  describe("getEmails", () => {
    it("requests the emails endpoint with the given params", async () => {
      const response = { success: true, data: { docs: [] } };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);

      const result = await service.getEmails({ offset: 20, limit: 5 });

      expect(mockAxios.get).toHaveBeenCalledWith("emails", {
        params: { offset: 20, limit: 5 },
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.getEmails()).rejects.toThrow("Fout bij ophalen emails");
    });
  });

  describe("getEmailById", () => {
    it('throws without calling axios when id is "create"', async () => {
      const service = new EmailsService(mockAxios as never);
      await expect(service.getEmailById("create")).rejects.toThrow(
        "Geen geldig email ID opgegeven",
      );
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it("fetches the detail for a real id", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);

      const result = await service.getEmailById("e1");

      expect(mockAxios.get).toHaveBeenCalledWith("email/e1");
      expect(result).toEqual(response);
    });
  });

  describe("createOrUpdateEmail", () => {
    it("posts to the email endpoint", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);
      const data = makeEmailData();

      const result = await service.createOrUpdateEmail(data);

      expect(mockAxios.post).toHaveBeenCalledWith("email", data);
      expect(result).toEqual(response);
    });

    it("uses the 'bijwerken' fallback when _id is present", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(
        service.createOrUpdateEmail(makeEmailData({ _id: "e1" })),
      ).rejects.toThrow("Fout bij bijwerken email");
    });

    it("uses the 'aanmaken' fallback when _id is absent", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.createOrUpdateEmail(makeEmailData())).rejects.toThrow(
        "Fout bij aanmaken email",
      );
    });
  });

  describe("deleteEmail", () => {
    it("calls DELETE on the email endpoint", async () => {
      mockAxios.delete.mockResolvedValue({});
      const service = new EmailsService(mockAxios as never);

      const result = await service.deleteEmail("e1");

      expect(mockAxios.delete).toHaveBeenCalledWith("/email/e1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("sendEmail", () => {
    it("posts to the send endpoint", async () => {
      const response = { success: true, data: makeEmailData() };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new EmailsService(mockAxios as never);
      const data = makeEmailData();

      const result = await service.sendEmail(data);

      expect(mockAxios.post).toHaveBeenCalledWith("/email/send", data);
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("x"));
      const service = new EmailsService(mockAxios as never);
      await expect(service.sendEmail(makeEmailData())).rejects.toThrow(
        "Fout bij verzenden email",
      );
    });
  });
});
