import { Colors, Spacing } from "@/constants/theme";

describe("Colors", () => {
  it("defines the same set of keys for light and dark", () => {
    expect(Object.keys(Colors.dark).sort()).toEqual(
      Object.keys(Colors.light).sort()
    );
  });

  it("uses valid 6-digit hex strings for every light-mode token", () => {
    Object.values(Colors.light).forEach((value) => {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("uses valid 6-digit hex strings for every dark-mode token", () => {
    Object.values(Colors.dark).forEach((value) => {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe("Spacing", () => {
  it("is a strictly increasing scale", () => {
    const values = Object.values(Spacing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
