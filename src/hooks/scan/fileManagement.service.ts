import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

import { ReceiptInfo, TextElement } from "@/hooks/receipt-parsing/types";

const RECEIPTS_DIRECTORY_NAME = "Bonnen";

// Ported from paperwork-app's useScan.ts: the vendor name is just the
// first OCR text element, not a detected "vendor" field - the source
// never built real vendor detection, and this filename is informational
// only (not parsed back), so that's preserved as-is.
function buildFileName(
  textElements: TextElement[],
  receiptInfo: ReceiptInfo,
): string {
  const vendor = textElements[0]?.text || "onbekend";
  const sanitizedVendor = vendor
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);

  const date = receiptInfo.date
    ? receiptInfo.date.toISOString().split("T")[0].replace(/-/g, "")
    : new Date().toISOString().split("T")[0].replace(/-/g, "");

  return `bon_${sanitizedVendor}_${date}_${Date.now()}.jpg`;
}

export async function moveScannedImage(
  sourcePath: string,
  textElements: TextElement[],
  receiptInfo: ReceiptInfo,
): Promise<string> {
  if (Platform.OS === "web") {
    return sourcePath;
  }

  try {
    const receiptsDir = new Directory(Paths.document, RECEIPTS_DIRECTORY_NAME);
    if (!receiptsDir.exists) {
      receiptsDir.create({ intermediates: true });
    }

    const destination = new File(
      receiptsDir,
      buildFileName(textElements, receiptInfo),
    );
    await new File(sourcePath).move(destination);

    return destination.uri;
  } catch {
    // Non-fatal, matching paperwork-app's useScan.ts: continue with the
    // original (temp) path rather than losing the scan over a storage error.
    return sourcePath;
  }
}
