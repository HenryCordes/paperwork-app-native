import { Colors } from "@/constants/theme";

type ColorScheme = "light" | "dark";

/**
 * Maps an invoice state string to the appropriate theme color string.
 * Mirrors the web app's getInvoiceBadgeColor, substituting theme tokens
 * for Ionic color names ("success" -> colors.success, etc.).
 */
export function getInvoiceBadgeColor(state: string | undefined, scheme: ColorScheme): string {
  const colors = Colors[scheme];
  if (!state) {
    return colors.textSecondary;
  }

  switch (state.toLowerCase()) {
    case "betaald":
      return colors.success;
    case "open":
      return colors.warning;
    case "te laat":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}
