export const colors = {
  bg: "#faf8f6",
  surface: "#ffffff",
  fg: "#1a1a2e",
  muted: "#6b6b7b",
  border: "#e8e4e0",

  accent: "#e05a3a",
  accentSoft: "#fdf0ec",
  /** Accent dark enough for white text and small text on light fills (WCAG AA). */
  accentStrong: "#c4462a",

  teal: "#2a8f8f",
  tealSoft: "#edf7f7",
  tealStrong: "#1f7171",

  gold: "#c99a2e",
  goldSoft: "#fdf6e8",
  goldStrong: "#8a6414",

  success: "#2d8f5e",
  danger: "#d94040",

  white: "#ffffff",
  transparent: "transparent",
  overlay: "rgba(26, 26, 46, 0.4)",
} as const;

export type ColorToken = keyof typeof colors;
