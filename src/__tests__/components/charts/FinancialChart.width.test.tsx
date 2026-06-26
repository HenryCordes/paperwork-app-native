import { render, fireEvent } from "@testing-library/react-native";

import { FinancialChart } from "@/components/charts/FinancialChart";

// react-native-gifted-charts's BarChart defaults parentWidth to the full
// device screen width whenever the prop isn't supplied - independent of
// the chart's actual (narrower, padded) container. That's the confirmed
// root cause of the right-side overflow / oversized left margin seen on a
// real device. Mock BarChart here to assert on the exact width it
// receives, decoupled from FinancialChart.test.tsx's real-rendering tests.
jest.mock("react-native-gifted-charts", () => ({
  BarChart: jest.fn(() => null),
}));

import { BarChart } from "react-native-gifted-charts";

describe("FinancialChart width", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not pass a parentWidth before the container has been measured", () => {
    render(<FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />);

    const [props] = (BarChart as jest.Mock).mock.calls[0];
    expect(props.parentWidth).toBeUndefined();
  });

  it("sizes the chart to its actual measured container width, not the screen width", () => {
    const { getByTestId } = render(
      <FinancialChart labels={["Jan"]} turnover={[1000]} expenses={[400]} />,
    );

    fireEvent(getByTestId("financial-chart-container"), "layout", {
      nativeEvent: { layout: { width: 343, height: 200 } },
    });

    const calls = (BarChart as jest.Mock).mock.calls;
    const [lastProps] = calls[calls.length - 1];
    expect(lastProps.parentWidth).toBe(343);
  });
});
