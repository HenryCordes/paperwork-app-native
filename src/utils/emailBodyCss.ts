/**
 * CSS for the tentap rich-text surface, shared by the email editor and the
 * read-only viewer so both render identically. `system-ui` resolves to the
 * platform UI font (San Francisco on iOS, Roboto on Android) — the same font
 * React Native's default <Text> uses — so the body matches the rest of the app.
 */
export function emailBodyCSS(colors: { background: string; text: string }): string {
  return (
    `body { background-color: ${colors.background}; color: ${colors.text}; ` +
    `font-family: system-ui, -apple-system, sans-serif; }`
  );
}
