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

  it("has no border by default, matching Dashboard's existing cards", () => {
    const { getByTestId } = render(
      <Card testID="card">
        <Text>content</Text>
      </Card>,
    );

    expect(getByTestId("card")).not.toHaveStyle({ borderWidth: 10 });
  });

  it("renders a visible border and tighter padding when bordered, for list/detail item cards", () => {
    const { getByTestId } = render(
      <Card testID="card" bordered>
        <Text>content</Text>
      </Card>,
    );

    expect(getByTestId("card")).toHaveStyle({ borderWidth: 10, padding: 8 });
  });

  it("still lets a caller-supplied style override the bordered defaults", () => {
    const { getByTestId } = render(
      <Card testID="card" bordered style={{ padding: 0 }}>
        <Text>content</Text>
      </Card>,
    );

    expect(getByTestId("card")).toHaveStyle({ borderWidth: 10, padding: 0 });
  });
});
