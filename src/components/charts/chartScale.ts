export interface NiceAxisScale {
  maxValue: number;
  stepValue: number;
  noOfSections: number;
}

const FALLBACK_SCALE: NiceAxisScale = { maxValue: 10, stepValue: 2, noOfSections: 5 };

function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

// Rounds an arbitrary data max into human-readable axis bounds (e.g. a max
// of 12830 becomes steps of 2000 up to 14000), instead of dividing the raw
// value evenly into sections and producing unreadable ticks like "€11.547".
export function getNiceAxisScale(maxValue: number, targetSections = 10): NiceAxisScale {
  if (maxValue <= 0) {
    return FALLBACK_SCALE;
  }

  const stepValue = niceStep(maxValue / targetSections);
  const noOfSections = Math.ceil(maxValue / stepValue);

  return { maxValue: stepValue * noOfSections, stepValue, noOfSections };
}
