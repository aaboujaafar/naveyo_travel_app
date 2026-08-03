export const colors = {
  bg: '#faf8f6',
  surface: '#ffffff',
  fg: '#1a1a2e',
  muted: '#6b6b7b',
  border: '#e8e4e0',

  accent: '#e05a3a',
  accentSoft: '#fdf0ec',

  teal: '#2a8f8f',
  tealSoft: '#edf7f7',

  gold: '#c99a2e',
  goldSoft: '#fdf6e8',

  success: '#2d8f5e',
  danger: '#d94040',

  white: '#ffffff',
  overlay: 'rgba(26, 26, 46, 0.4)',
} as const;

export type ColorToken = keyof typeof colors;
