import { renderHook, act } from "@testing-library/react-native";

import { useScan } from "@/hooks/scan/useScan";
import { scanDocument } from "@/hooks/scan/documentScanner.service";
import { recognizeText } from "@/hooks/scan/ocr.service";
import { moveScannedImage } from "@/hooks/scan/fileManagement.service";
import { extractReceiptInfo } from "@/hooks/receipt-parsing";

// documentScanner.service imports react-native-document-scanner-plugin at
// module scope, which calls TurboModuleRegistry.getEnforcing() eagerly and
// throws outside a native runtime. jest.mock(path) with no factory (below)
// still has to load the real module once to infer the mock's shape, so the
// native plugin needs its own mock first - same approach as
// documentScanner.service.test.ts.
jest.mock("react-native-document-scanner-plugin", () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));

jest.mock("@/hooks/scan/documentScanner.service");
jest.mock("@/hooks/scan/ocr.service");
jest.mock("@/hooks/scan/fileManagement.service");
jest.mock("@/hooks/receipt-parsing", () => ({
  extractReceiptInfo: jest.fn(),
}));

describe("useScan", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the parsed receipt and the moved image uri on success", async () => {
    (scanDocument as jest.Mock).mockResolvedValue({
      imagePath: "/tmp/scan1.jpg",
    });
    (recognizeText as jest.Mock).mockResolvedValue([
      { text: "Totaal 12,50" },
    ]);
    (extractReceiptInfo as jest.Mock).mockReturnValue({
      date: new Date("2026-06-25"),
      total: 12.5,
      taxLow: 0,
      taxHigh: 2.18,
    });
    (moveScannedImage as jest.Mock).mockResolvedValue(
      "file:///Bonnen/bon.jpg",
    );

    const { result } = renderHook(() => useScan());

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scan();
    });

    expect(scanResult).toEqual({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    expect(result.current.scanError).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });

  it("returns null without an error when the user cancels", async () => {
    (scanDocument as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useScan());

    let scanResult;
    await act(async () => {
      scanResult = await result.current.scan();
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toBeNull();
  });

  it("sets a Dutch error message when OCR or parsing throws", async () => {
    (scanDocument as jest.Mock).mockResolvedValue({
      imagePath: "/tmp/scan1.jpg",
    });
    (recognizeText as jest.Mock).mockRejectedValue(new Error("ocr failed"));

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanError).toBe(
      "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
    );
  });
});
