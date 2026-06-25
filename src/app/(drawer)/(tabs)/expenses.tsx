import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useScan } from "@/hooks/scan/useScan";
import { ScanResult } from "@/hooks/scan/scan.types";
import { formatCurrency } from "@/utils/currency";
import { Colors, Spacing } from "@/constants/theme";

export default function Expenses() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { scan, isScanning, scanError } = useScan();
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    const scanResult = await scan();
    setResult(scanResult);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleScan}
        disabled={isScanning}
      >
        <Text style={styles.buttonText}>
          {isScanning ? "Bon scannen..." : "Bon scannen"}
        </Text>
      </Pressable>

      {scanError ? (
        <Text style={[styles.message, { color: colors.text }]}>
          {scanError}
        </Text>
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <Image source={{ uri: result.imageUri }} style={styles.preview} />
          <Text style={{ color: colors.text }}>
            Datum: {result.receiptInfo.date.toLocaleDateString("nl-NL")}
          </Text>
          <Text style={{ color: colors.text }}>
            Totaalbedrag: €{formatCurrency(result.receiptInfo.total)}
          </Text>
          {result.receiptInfo.taxLow > 0 ? (
            <Text style={{ color: colors.text }}>
              BTW Laag (9%): €{formatCurrency(result.receiptInfo.taxLow)}
            </Text>
          ) : null}
          {result.receiptInfo.taxHigh > 0 ? (
            <Text style={{ color: colors.text }}>
              BTW Hoog (21%): €{formatCurrency(result.receiptInfo.taxHigh)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!result && !scanError && !isScanning ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Scan een bon om de gegevens automatisch te herkennen.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  button: {
    borderRadius: 8,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  message: {
    textAlign: "center",
  },
  resultCard: {
    width: "100%",
    gap: Spacing.two,
    alignItems: "center",
  },
  preview: {
    width: 200,
    height: 260,
    borderRadius: 8,
  },
});
