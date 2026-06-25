import DocumentScanner from "react-native-document-scanner-plugin";

export interface DocumentScanResult {
  imagePath: string;
}

export async function scanDocument(): Promise<DocumentScanResult | null> {
  // maxNumDocuments is Android-only per the library's docs - iOS's own
  // scanner UI already limits a session to one capture, ported from
  // paperwork-app's useScan.ts which sets the same option for the same
  // reason ("prevent multiple scans").
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    maxNumDocuments: 1,
  });

  if (status === "cancel" || !scannedImages || scannedImages.length === 0) {
    return null;
  }

  return { imagePath: scannedImages[0] };
}
