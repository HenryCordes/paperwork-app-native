import { toDutchMonthLabel } from "@/components/charts/monthLabels";

describe("toDutchMonthLabel", () => {
  it("translates an English month name while keeping the year", () => {
    expect(toDutchMonthLabel("January 2025")).toBe("Januari 2025");
    expect(toDutchMonthLabel("March 2025")).toBe("Maart 2025");
    expect(toDutchMonthLabel("May 2025")).toBe("Mei 2025");
    expect(toDutchMonthLabel("July 2025")).toBe("Juli 2025");
  });

  it("leaves month names that are already spelled the same in Dutch unchanged", () => {
    expect(toDutchMonthLabel("April 2025")).toBe("April 2025");
    expect(toDutchMonthLabel("November 2025")).toBe("November 2025");
  });

  it("returns labels it doesn't recognize unchanged", () => {
    expect(toDutchMonthLabel("Q1 2025")).toBe("Q1 2025");
    expect(toDutchMonthLabel("2025")).toBe("2025");
  });
});
