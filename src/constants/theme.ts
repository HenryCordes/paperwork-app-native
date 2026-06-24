import { Platform } from "react-native";

const light = {
  primary: "#0054e9",
  secondary: "#0163aa",
  tertiary: "#6030ff",
  success: "#2dd55b",
  warning: "#ffc409",
  danger: "#c5000f",
  background: "#ffffff",
  text: "#000000",
  backgroundElement: "#f4f5f8",
  textSecondary: "#636469",
} as const;

const dark = {
  primary: "#4d8dff",
  secondary: "#46b1ff",
  tertiary: "#8482fb",
  success: "#2dd55b",
  warning: "#ffce31",
  danger: "#f24c58",
  // iOS and Android (md) use different dark-mode surfaces in Ionic too —
  // OLED-true-black on iOS, Material's #121212 on Android.
  background: Platform.select({ ios: "#000000", default: "#121212" }),
  text: "#ffffff",
  backgroundElement: Platform.select({ ios: "#1c1c1d", default: "#1e1e1e" }),
  textSecondary: "#989aa2",
} as const;

export const Colors = { light, dark };

export type ThemeColor = keyof typeof light;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
