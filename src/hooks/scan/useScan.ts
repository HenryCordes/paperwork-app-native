import { useCallback, useState } from "react";

import { scanDocument } from "./documentScanner.service";
import { recognizeText } from "./ocr.service";
import { moveScannedImage } from "./fileManagement.service";
import { extractReceiptInfo } from "@/hooks/receipt-parsing";
import { ScanResult } from "./scan.types";

export function useScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<ScanResult | null> => {
    setIsScanning(true);
    setScanError(null);

    try {
      const scanned = await scanDocument();
      if (!scanned) {
        // User cancelled - not a failure, nothing to report.
        return null;
      }

      const textElements = await recognizeText(scanned.imagePath);
      const receiptInfo = extractReceiptInfo(textElements);
      const imageUri = await moveScannedImage(
        scanned.imagePath,
        textElements,
        receiptInfo,
      );

      return { imageUri, receiptInfo };
    } catch {
      setScanError(
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
      );
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scan, isScanning, scanError };
}

export default useScan;
