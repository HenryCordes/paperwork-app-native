import TextRecognition, {
  TextLine,
} from "@react-native-ml-kit/text-recognition";

import { TextElement } from "@/hooks/receipt-parsing/types";

function toTextElement(line: TextLine): TextElement {
  if (!line.cornerPoints) {
    return { text: line.text };
  }

  // Standard Android ML Kit order: clockwise from top-left. See this
  // file's verification checkpoint in the Phase 2 plan if a real scan
  // shows otherwise.
  const [topLeft, topRight, bottomRight, bottomLeft] = line.cornerPoints;

  return {
    text: line.text,
    topLeft: [topLeft.x, topLeft.y],
    topRight: [topRight.x, topRight.y],
    bottomLeft: [bottomLeft.x, bottomLeft.y],
    bottomRight: [bottomRight.x, bottomRight.y],
  };
}

export async function recognizeText(imagePath: string): Promise<TextElement[]> {
  const result = await TextRecognition.recognize(imagePath);
  return result.blocks.flatMap((block) => block.lines.map(toTextElement));
}
