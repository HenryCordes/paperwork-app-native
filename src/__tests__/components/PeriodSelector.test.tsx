import { render, fireEvent } from "@testing-library/react-native";

import { PeriodSelector } from "@/components/PeriodSelector";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";

describe("PeriodSelector", () => {
  it("shows the current type and preset as collapsed dropdown values, with no options visible yet", () => {
    const { getByText, queryByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={jest.fn()}
      />,
    );

    expect(getByText("Maand")).toBeTruthy();
    expect(getByText("Dit Jaar")).toBeTruthy();
    // The other type/preset options aren't in the tree until their dropdown is opened.
    expect(queryByText("Jaar")).toBeNull();
    expect(queryByText("Vorig Jaar")).toBeNull();
  });

  it("opens the type picker and calls onPeriodChange with the new type, keeping the current preset", () => {
    const onPeriodChange = jest.fn();
    const { getByText, getByTestId } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByTestId("period-type-dropdown"));
    fireEvent.press(getByText("Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.YEARLY,
      PERIOD_PRESETS.THIS_YEAR,
    );
  });

  it("opens the preset picker and calls onPeriodChange with the new preset, keeping the current type", () => {
    const onPeriodChange = jest.fn();
    const { getByText, getByTestId } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByTestId("period-preset-dropdown"));
    fireEvent.press(getByText("Vorig Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.MONTHLY,
      PERIOD_PRESETS.LAST_YEAR,
    );
  });

  it("closes the picker after a selection", () => {
    const { getByText, getByTestId, queryByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("period-type-dropdown"));
    fireEvent.press(getByText("Jaar"));

    expect(queryByText("Kwartaal")).toBeNull();
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
