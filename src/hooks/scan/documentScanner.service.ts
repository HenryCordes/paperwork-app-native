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

  // Verification checkpoint (Phase 2 plan): it isn't confirmed whether a
  // denied camera permission surfaces here as status === "cancel"
  // (indistinguishable from a real cancel, so silent) or as a rejected
  // promise (caught upstream in useScan, surfaced as the generic Dutch
  // error). Confirm on a real device; if a distinct denial message turns
  // out to be needed, the fix is a permission pre-check here.
  if (status === "cancel" || !scannedImages || scannedImages.length === 0) {
    return null;
  }

  return { imagePath: scannedImages[0] };
}
