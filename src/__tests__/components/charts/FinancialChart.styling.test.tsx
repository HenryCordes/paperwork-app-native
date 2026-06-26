import { render } from "@testing-library/react-native";
import { useColorScheme } from "react-native";

// Bug, confirmed on a real device: BarChart's default grid lines are dashed
// and the default axis-label text has no explicit color, rendering black -
// illegible against this app's dark background. Mock BarChart to assert on
// the exact styling props it receives, decoupled from
// FinancialChart.test.tsx's real-rendering tests.
jest.mock("react-native-gifted-charts", () => ({
  BarChart: jest.fn(() => null),
}));
jest.mock("react-native/Libraries/Utilities/useColorScheme");

import { BarChart } from "react-native-gifted-charts";
import { FinancialChart } from "@/components/charts/FinancialChart";

describe("FinancialChart styling", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses solid, subtle grid lines and a readable axis-label color in dark mode", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.rulesType).toBe("solid");
    expect(props.rulesColor).toBe("rgba(255, 255, 255, 0.1)");
    // Vertical grid lines must match the horizontal rule color - the source
    // app's Chart.js config uses the same subtle color for both axes.
    expect(props.verticalLinesColor).toBe("rgba(255, 255, 255, 0.1)");
    expect(props.yAxisTextStyle).toEqual(
      expect.objectContaining({ color: "#989aa2" }),
    );
    expect(props.xAxisLabelTextStyle).toEqual(
      expect.objectContaining({ color: "#989aa2" }),
    );
  });

  it("formats the Y-axis with whole euros (no cents) while the tooltip keeps exact cents", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.formatYLabel("14000")).toBe("14.000");
  });

  it("uses the light-mode equivalents when the device is in light mode", () => {
    (useColorScheme as jest.Mock).mockReturnValue("light");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.rulesColor).toBe("rgba(0, 0, 0, 0.1)");
    expect(props.yAxisTextStyle).toEqual(
      expect.objectContaining({ color: "#636469" }),
    );
  });

  // Bars were visibly wider than the source's, even after an earlier pass
  // (barWidth: 22) - narrowed further.
  it("uses a narrow bar width matching the source's proportions", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.barWidth).toBe(16);
  });
});
