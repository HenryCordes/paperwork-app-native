import { render } from "@testing-library/react-native";

import { PieChart } from "@/components/charts/PieChart";

describe("PieChart", () => {
  it("shows a legend with both slices' Dutch labels and formatted values", () => {
    const { getByText } = render(<PieChart revenue={2200} expenses={900} />);

    expect(getByText(/Omzet: €2\.200,00/)).toBeTruthy();
    expect(getByText(/Uitgaven: €900,00/)).toBeTruthy();
  });
});
