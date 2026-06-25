import { render, fireEvent } from "@testing-library/react-native";

import { PeriodSelector } from "@/components/PeriodSelector";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";

describe("PeriodSelector", () => {
  it("calls onPeriodChange with the new type, keeping the current preset", () => {
    const onPeriodChange = jest.fn();
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByText("Maand"));
    fireEvent.press(getByText("Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.YEARLY,
      PERIOD_PRESETS.THIS_YEAR,
    );
  });

  it("calls onPeriodChange with the new preset, keeping the current type", () => {
    const onPeriodChange = jest.fn();
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByText("Dit Jaar"));
    fireEvent.press(getByText("Vorig Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.MONTHLY,
      PERIOD_PRESETS.LAST_YEAR,
    );
  });

  it("shows the not-yet-implemented message when the custom preset is selected", () => {
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.CUSTOM}
        onPeriodChange={jest.fn()}
      />,
    );

    expect(
      getByText("Aangepaste periode-functionaliteit volgt in toekomstige update"),
    ).toBeTruthy();
  });
});
