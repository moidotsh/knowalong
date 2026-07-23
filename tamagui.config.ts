import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { tokens, themes } from '@tamagui/themes';
import { animations } from '@tamagui/config';
import { theme as appTheme } from './constants';

// Font weight mappings for Tamagui. The `true` and named size entries prevent
// fill-forward from carrying '900' into defaults (load-bearing when consumers
// spread font shorthand props).
const fontWeights = {
  1: '100',
  2: '200',
  3: '300',
  4: '400',
  5: '500',
  6: '600',
  7: '700',
  8: '800',
  9: '900',
  true: '400',
  small: '400',
  medium: '400',
  large: '400',
};

const fontSizes = {
  small: 14,
  medium: 16,
  large: 18,
};

const headingFont = createInterFont({
  family: 'Inter',
  weight: fontWeights,
  size: fontSizes,
});
const bodyFont = createInterFont({
  family: 'Inter',
  weight: fontWeights,
  size: fontSizes,
});

const config = createTamagui({
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  settings: {
    defaultFont: 'body',
  },
  // Arqavellum ships both `light` (default) and `dark` themes. The
  // ThemeProvider in context/ThemeContext.tsx switches the active theme
  // via TamaguiProvider's `defaultTheme` prop; both stay registered here
  // so the swap is instant.
  themes: {
    light: {
      background: '#FFFFFF',
      backgroundHover: '#F8F9FB',
      backgroundFocus: '#F0F2F5',
      backgroundPress: '#E6E9EE',
      borderColor: '#E5E7EB',
      borderColorHover: '#D1D5DB',
      borderColorFocus: '#9CA3AF',
      borderColorPress: '#6B7280',
      outlineColor: '#D1D5DB',
      color: '#0F172A',
    },
    dark: {
      background: '#0B0F19',
      backgroundHover: '#111827',
      backgroundFocus: '#161E2E',
      backgroundPress: '#1E293B',
      borderColor: '#334155',
      borderColorHover: '#475569',
      borderColorFocus: '#64748B',
      borderColorPress: '#94A3B8',
      outlineColor: '#475569',
      color: '#F1F5F9',
    },
  },
  allowFontScaling: false,
  tokens: {
    ...tokens,
    size: {
      ...tokens.size,
      small: 14,
      medium: 16,
      large: 18,
    },
    space: {
      ...tokens.space,
      xxs: 2,
      xs: 4,
      small: 8,
      medium: 16,
      large: 24,
      xlarge: 32,
      xxlarge: 48,
    },
    radius: {
      ...tokens.radius,
      small: 8,
      medium: 12,
      large: 16,
      pill: 9999,
    },
    zIndex: tokens.zIndex,
    color: tokens.color,
  },
  shorthands,
  animations,

  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 860 },
    md: { maxWidth: 980 },
    lg: { maxWidth: 1120 },
    xl: { maxWidth: 1280 },
    xxl: { maxWidth: 1420 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 860 + 1 },
    gtMd: { minWidth: 980 + 1 },
    gtLg: { minWidth: 1120 + 1 },
  },

  defaultTheme: 'light',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: true,
});

type AppConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
