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

  // Bug, confirmed on a real device: the skewed x-axis date labels were
  // invisible - the legend below the chart appeared right where the labels
  // should have been. rotateLabel needs extra reserved height for the
  // diagonal text, which the chart's overflow:"hidden" container was
  // otherwise clipping.
  it("reserves extra height for the rotated x-axis labels so they aren't clipped", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.labelsExtraHeight).toBe(24);
  });

  // The source's x-axis labels render at a skewed angle, which gives each
  // one much more effective length to read without truncating - confirmed
  // against the source screenshot. Abbreviating the label text (a separate,
  // already-applied fix) helps, but doesn't replace this.
  it("rotates the x-axis labels, matching the source's skewed look", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.rotateLabel).toBe(true);
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

  // Bug, confirmed on a real device: with the default (bar-width-sized)
  // label box, a full label like "February 2025" truncated to "f...". The
  // box needs to be wide enough to hold the full text before rotation is
  // applied - rotation then uses that extra width as diagonal space.
  it("reserves enough label width to fit a full 'Month Year' label", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.labelWidth).toBeGreaterThanOrEqual(100);
  });

  // Bug, confirmed on a real device: the library's own rotateLabel rotates
  // positive-value bars clockwise (+60deg internally), which is the mirror
  // image of the source's counterclockwise skew. There's no prop to flip
  // the direction, so this counter-rotates the label text itself (-105deg)
  // to land on a net -45deg, matching the source visually.
  it("counter-rotates the label text to land on the source's skew direction", () => {
    (useColorScheme as jest.Mock).mockReturnValue("dark");

    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.xAxisLabelTextStyle).toEqual(
      expect.objectContaining({ transform: [{ rotate: "-105deg" }] }),
    );
  });
});
