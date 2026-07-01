import { isEmptyHtmlBody } from "@/utils/htmlContent";

describe("isEmptyHtmlBody", () => {
  it("treats an empty string as empty", () => {
    expect(isEmptyHtmlBody("")).toBe(true);
  });

  it("treats the editor's empty paragraph as empty", () => {
    expect(isEmptyHtmlBody("<p></p>")).toBe(true);
  });

  it("treats whitespace-and-nbsp-only markup as empty", () => {
    expect(isEmptyHtmlBody("<p>&nbsp; </p>")).toBe(true);
  });

  it("treats a body with text as non-empty", () => {
    expect(isEmptyHtmlBody("<p>Hallo</p>")).toBe(false);
  });

  it("treats an image-only body as non-empty", () => {
    expect(isEmptyHtmlBody('<p><img src="https://x/y.png" /></p>')).toBe(false);
  });
});
