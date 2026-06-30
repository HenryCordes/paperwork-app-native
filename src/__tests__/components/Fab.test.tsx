import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { Fab } from "@/components/Fab";

describe("Fab", () => {
  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Fab testID="test-fab" onPress={onPress} />);
    fireEvent.press(getByTestId("test-fab"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders custom children when provided", () => {
    const { getByText } = render(
      <Fab testID="test-fab" onPress={jest.fn()}>
        <Text>X</Text>
      </Fab>,
    );
    expect(getByText("X")).toBeTruthy();
  });
});
