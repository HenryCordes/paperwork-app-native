import { render } from "@testing-library/react-native";

import { ChartLegend } from "@/components/charts/ChartLegend";

describe("ChartLegend", () => {
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
