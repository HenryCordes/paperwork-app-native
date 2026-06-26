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

  // Bug, confirmed on a real device: the Y-axis label had no euro sign at
  // all (every other amount on this screen is prefixed with one), and the
  // label text was clipped behind the chart's own plot area because the
  // reserved label width didn't account for the "€" prefix.
  it("formats the Y-axis with a euro sign and whole euros (no cents), with enough reserved width to avoid clipping", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.formatYLabel("14000")).toBe("€14.000");
    // Bug, confirmed on a real device: 56 was still not enough room for a
    // value like "€14.000" and kept clipping behind the chart - widened
    // further.
    expect(props.yAxisLabelWidth).toBe(72);
    // Bug, confirmed on a real device: the Y-axis labels were
    // right-aligned (hugging the plot area); the source left-aligns them.
    expect(props.yAxisTextStyle).toEqual(
      expect.objectContaining({ textAlign: "left" }),
    );
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

  // Bug, confirmed on a real device: the Y-axis divided the raw max bar
  // value evenly into 10 sections (e.g. "€11.547"), instead of rounding to
  // a human-friendly step like the source's "€2.000" increments.
  it("rounds the Y-axis bounds to a nice human-readable scale based on the max bar value", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(
      <FinancialChart labels={["Jan"]} turnover={[12830]} expenses={[400]} />,
    );

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.maxValue).toBe(14000);
    expect(props.stepValue).toBe(2000);
    expect(props.noOfSections).toBe(7);
  });

  // Bug, confirmed on a real device: the default label box (barWidth +
  // spacing, ~18px) truncated even a short label like "Jan" to "J..". There
  // is no axis rotation here (the labels must scroll in sync with the bars,
  // which only the chart's own native rendering does), so the box has to be
  // wide enough on its own to fit the widest label this chart shows - the
  // "25-02" daily format.
  it("widens the label box to fit the widest label without rotating it", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.labelWidth).toBe(48);
    expect(props.rotateLabel).toBeUndefined();
  });

  // Bug, confirmed on a real device: widening the label box (above) shifts
  // its center right of the bar by (labelWidth-barWidth)/2 = 16px, since the
  // box's left/width math centers it at labelWidth/2 from the bar's own left
  // edge, not barWidth/2. This counter-shifts the text back to recenter it.
  it("recenters the label text under the bar after widening its box", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.xAxisLabelTextStyle).toEqual(
      expect.objectContaining({ transform: [{ translateX: -16 }] }),
    );
  });
});
