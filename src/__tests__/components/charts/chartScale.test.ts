import { getNiceAxisScale } from "@/components/charts/chartScale";

describe("getNiceAxisScale", () => {
  // Bug, confirmed on a real device: the Y-axis divided the raw max value
  // into 10 even slices (e.g. 12830 -> steps of 1283), producing
  // unreadable values like "€11.547". The source rounds to a human-friendly
  // step (here, 2000) and extends the max to cover the data.
  it("rounds an uneven max into a nice round step and max", () => {
    expect(getNiceAxisScale(12830)).toEqual({
      maxValue: 14000,
      stepValue: 2000,
      noOfSections: 7,
    });
  });

  it("picks a nice step for a small max value", () => {
    expect(getNiceAxisScale(47)).toEqual({
      maxValue: 50,
      stepValue: 5,
      noOfSections: 10,
    });
  });

  it("leaves an already-round max value unchanged", () => {
    expect(getNiceAxisScale(10000)).toEqual({
      maxValue: 10000,
      stepValue: 1000,
      noOfSections: 10,
    });
  });

  // Guards against division by zero when every bar in the period is 0.
  it("falls back to a sane default when the max value is zero", () => {
    expect(getNiceAxisScale(0)).toEqual({
      maxValue: 10,
      stepValue: 2,
      noOfSections: 5,
    });
  });
});
