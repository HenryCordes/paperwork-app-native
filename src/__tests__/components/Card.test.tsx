import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { Card } from "@/components/Card";

describe("Card", () => {
  it("renders its children inside a rounded, theme-colored surface", () => {
    const { getByText, getByTestId } = render(
      <Card testID="card">
        <Text>content</Text>
      </Card>,
    );

    expect(getByText("content")).toBeTruthy();
    expect(getByTestId("card")).toHaveStyle({ borderRadius: 12 });
  });

  it("merges a caller-supplied style on top of the card's own", () => {
    const { getByTestId } = render(
      <Card testID="card" style={{ marginTop: 20 }}>
        <Text>content</Text>
      </Card>,
    );

    expect(getByTestId("card")).toHaveStyle({ borderRadius: 12, marginTop: 20 });
  });
});
