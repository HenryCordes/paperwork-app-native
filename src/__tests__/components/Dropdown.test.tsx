import { render, fireEvent } from "@testing-library/react-native";

import { Dropdown } from "@/components/Dropdown";

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Optie A" },
    { value: "b", label: "Optie B" },
  ];

  it("shows the current value's label and opens the option list on press", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    expect(getByText("Optie A")).toBeTruthy();
    expect(queryByText("Optie B")).toBeNull();

    fireEvent.press(getByTestId("test-dropdown"));

    expect(getByText("Optie B")).toBeTruthy();
  });

  it("calls onSelect and closes the list when an option is pressed", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("test-dropdown"));
    fireEvent.press(getByText("Optie B"));

    expect(onSelect).toHaveBeenCalledWith("b");
    expect(queryByText("Optie B")).toBeNull();
  });

  it("closes without selecting when the overlay is pressed", () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("test-dropdown"));
    fireEvent.press(getByTestId("test-dropdown-overlay"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(queryByText("Optie B")).toBeNull();
  });

  it("closes without selecting when the system back action requests it", () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("test-dropdown"));
    fireEvent(getByTestId("test-dropdown-modal"), "requestClose");

    expect(onSelect).not.toHaveBeenCalled();
    expect(queryByText("Optie B")).toBeNull();
  });
});
