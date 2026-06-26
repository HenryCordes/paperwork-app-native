import { DocumentsService } from "@/api/services/documentsService";

describe("DocumentsService", () => {
  const mockAxios = { post: jest.fn() };
  const appendSpy = jest.fn();
  const OriginalFormData = globalThis.FormData;

  beforeEach(() => {
    globalThis.FormData = jest.fn().mockImplementation(() => ({
      append: appendSpy,
    })) as unknown as typeof FormData;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.FormData = OriginalFormData;
  });

  describe("getDocumentUrl", () => {
    it("builds the full document URL from the axios baseURL and the file path", () => {
      const axios = { defaults: { baseURL: "https://api.example.com/" } };
      const service = new DocumentsService(axios as never);

      expect(service.getDocumentUrl("receipts/abc123.jpg")).toBe(
        "https://api.example.com/document/receipts/abc123.jpg",
      );
    });

    it("throws when no base URL is configured", () => {
      const axios = { defaults: { baseURL: undefined } };
      const service = new DocumentsService(axios as never);

      expect(() => service.getDocumentUrl("receipts/abc123.jpg")).toThrow(
        "API base URL not configured",
      );
    });
  });

  describe("uploadReceiptDocument", () => {
    const file = { uri: "file:///tmp/receipt.jpg", name: "receipt.jpg", type: "image/jpeg" };

    it("sends a FormData with the file appended and returns the stored file path", async () => {
      mockAxios.post.mockResolvedValue({
        data: { success: true, data: { fileLocation: "receipts/abc123.jpg" } },
      });
      const service = new DocumentsService(mockAxios as never);

      const result = await service.uploadReceiptDocument(file);

      expect(appendSpy).toHaveBeenCalledWith("file", file);
      expect(mockAxios.post).toHaveBeenCalledWith(
        "document",
        expect.anything(),
        expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }),
      );
      expect(result).toBe("receipts/abc123.jpg");
    });

    it("throws the API's error message on failure", async () => {
      mockAxios.post.mockRejectedValue({
        response: { data: { message: "Upload mislukt" } },
      });
      const service = new DocumentsService(mockAxios as never);

      await expect(service.uploadReceiptDocument(file)).rejects.toThrow("Upload mislukt");
    });

    it("falls back to a generic message when the API gives none", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new DocumentsService(mockAxios as never);

      await expect(service.uploadReceiptDocument(file)).rejects.toThrow(
        "Failed to upload document",
      );
    });
  });
});
