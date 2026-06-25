import { render } from "@testing-library/react-native";
import { useColorScheme } from "react-native";

import { ChartLegend } from "@/components/charts/ChartLegend";

jest.mock("react-native/Libraries/Utilities/useColorScheme");

describe("ChartLegend", () => {
  // Bug: the legend's swatch (a colored circle) rendered fine, but its text
  // had no color at all, defaulting to the platform's black - invisible
  // against a dark-mode background. On a real device this looked like "two
  // bare colored circles with no labels."
  it("uses the dark-theme text color when the device is in dark mode", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    const { getByText } = render(
      <ChartLegend items={[{ color: "#0054e9", label: "Omzet", value: "€100,00" }]} />,
    );

    expect(getByText("Omzet: €100,00")).toHaveStyle({ color: "#ffffff" });
  });


  it("renders one row per item with its label and formatted value", () => {
    const { getByText } = render(
      <ChartLegend
        items={[
          { color: "#0054e9", label: "Omzet", value: "€1.200,00" },
          { color: "#c5000f", label: "Uitgaven", value: "€500,00" },
        ]}
      />,
    );

    expect(getByText("Omzet: €1.200,00")).toBeTruthy();
    expect(getByText("Uitgaven: €500,00")).toBeTruthy();
  });

  it("renders nothing when given an empty list", () => {
    const { queryByText } = render(<ChartLegend items={[]} />);
    expect(queryByText(/:/)).toBeNull();
  });
});
