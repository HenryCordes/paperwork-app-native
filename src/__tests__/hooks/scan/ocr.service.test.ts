import TextRecognition from "@react-native-ml-kit/text-recognition";

import { recognizeText } from "@/hooks/scan/ocr.service";

jest.mock("@react-native-ml-kit/text-recognition", () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

describe("recognizeText", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("flattens blocks/lines into TextElements with mapped corner points", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "Totaal 12,50",
      blocks: [
        {
          text: "Totaal 12,50",
          lines: [
            {
              text: "Totaal 12,50",
              cornerPoints: [
                { x: 1, y: 2 },
                { x: 10, y: 2 },
                { x: 10, y: 5 },
                { x: 1, y: 5 },
              ],
            },
          ],
        },
      ],
    });

    expect(await recognizeText("/tmp/scan1.jpg")).toEqual([
      {
        text: "Totaal 12,50",
        topLeft: [1, 2],
        topRight: [10, 2],
        bottomLeft: [1, 5],
        bottomRight: [10, 5],
      },
    ]);
  });

  it("flattens multiple blocks and multiple lines per block, in order", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "A B",
      blocks: [
        { text: "A", lines: [{ text: "A" }] },
        { text: "B", lines: [{ text: "B1" }, { text: "B2" }] },
      ],
    });

    const result = await recognizeText("/tmp/scan1.jpg");

    expect(result.map((e) => e.text)).toEqual(["A", "B1", "B2"]);
  });

  it("omits corner fields when a line has no cornerPoints", async () => {
    (TextRecognition.recognize as jest.Mock).mockResolvedValue({
      text: "x",
      blocks: [{ text: "x", lines: [{ text: "x" }] }],
    });

    expect(await recognizeText("/tmp/scan1.jpg")).toEqual([{ text: "x" }]);
  });
});
