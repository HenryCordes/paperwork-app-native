import { ReceiptInfo } from "@/hooks/receipt-parsing/types";

export interface ScanResult {
  imageUri: string;
  receiptInfo: ReceiptInfo;
}
