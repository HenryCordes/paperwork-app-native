import DocumentScanner from "react-native-document-scanner-plugin";

import { scanDocument } from "@/hooks/scan/documentScanner.service";

jest.mock("react-native-document-scanner-plugin", () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));

describe("scanDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the first scanned image path on success", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: ["/tmp/scan1.jpg"],
      status: "success",
    });

    expect(await scanDocument()).toEqual({ imagePath: "/tmp/scan1.jpg" });
  });

  it("returns null when the user cancels", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: [],
      status: "cancel",
    });

    expect(await scanDocument()).toBeNull();
  });

  it("returns null if there are no scanned images despite a success status", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: [],
      status: "success",
    });

    expect(await scanDocument()).toBeNull();
  });

  it("passes maxNumDocuments: 1 to limit the capture to one document", async () => {
    (DocumentScanner.scanDocument as jest.Mock).mockResolvedValue({
      scannedImages: ["/tmp/scan1.jpg"],
      status: "success",
    });

    await scanDocument();

    expect(DocumentScanner.scanDocument).toHaveBeenCalledWith({
      maxNumDocuments: 1,
    });
  });
});
