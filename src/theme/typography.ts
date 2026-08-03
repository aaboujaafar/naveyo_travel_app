import { Platform, TextStyle } from 'react-native';

const displayFont = Platform.select({ ios: 'Avenir Next', android: 'Roboto', default: 'System' });

export const typography = {
  displayHero: {
    fontFamily: displayFont,
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  h1: {
    fontFamily: displayFont,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.64,
    lineHeight: 37,
  },
  h2: {
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.48,
    lineHeight: 28,
  },
  h3: {
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.18,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 21,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.28,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.24,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.04,
    lineHeight: 17,
  },
  badge: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.66,
    lineHeight: 11,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
