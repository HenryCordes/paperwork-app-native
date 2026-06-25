import { render, fireEvent } from "@testing-library/react-native";

import Expenses from "@/app/(drawer)/(tabs)/expenses";
import { useScan } from "@/hooks/scan/useScan";

// Same fix Task 5 needed: automocking useScan still loads the real module
// once to infer its shape, which transitively imports
// react-native-document-scanner-plugin - that plugin throws via
// TurboModuleRegistry.getEnforcing() outside a native runtime unless it's
// mocked first.
jest.mock("react-native-document-scanner-plugin", () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));
jest.mock("@/hooks/scan/useScan");

describe("Expenses (Kosten) screen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the extracted fields after a successful scan", async () => {
    const scan = jest.fn().mockResolvedValue({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError: null,
    });

    const { findByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    expect(await findByText(/Totaalbedrag: €12,50/)).toBeTruthy();
    expect(await findByText(/BTW Hoog \(21%\): €2,18/)).toBeTruthy();
  });

  it("hides a tax field when it's zero", async () => {
    const scan = jest.fn().mockResolvedValue({
      imageUri: "file:///Bonnen/bon.jpg",
      receiptInfo: {
        date: new Date("2026-06-25"),
        total: 12.5,
        taxLow: 0,
        taxHigh: 2.18,
      },
    });
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError: null,
    });

    const { findByText, queryByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    await findByText(/Totaalbedrag/);
    expect(queryByText(/BTW Laag/)).toBeNull();
  });

  it("shows the Dutch error message when scanning fails", async () => {
    const scan = jest.fn().mockResolvedValue(null);
    (useScan as jest.Mock).mockReturnValue({
      scan,
      isScanning: false,
      scanError:
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
    });

    const { findByText, getByText } = render(<Expenses />);
    fireEvent.press(getByText("Bon scannen"));

    expect(
      await findByText(
        "Het scannen heeft geen bruikbare gegevens opgeleverd. Probeer opnieuw te scannen.",
      ),
    ).toBeTruthy();
  });

  it("disables the scan button while scanning", () => {
    (useScan as jest.Mock).mockReturnValue({
      scan: jest.fn(),
      isScanning: true,
      scanError: null,
    });

    const { getByText } = render(<Expenses />);

    expect(getByText("Bon scannen...")).toBeTruthy();
  });
});
