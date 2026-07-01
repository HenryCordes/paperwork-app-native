/**
 * True when an HTML fragment has no visible content. The rich-text editor
 * (@10play/tentap-editor) emits "<p></p>" for a visually empty document, which
 * is truthy and survives a plain String.trim(), so callers need this to tell a
 * genuinely empty body apart from one that only looks empty. A body that
 * contains an image counts as content even when it has no text.
 */
export function isEmptyHtmlBody(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0 && !/<img\b/i.test(html);
}
