// components/premium/shared/index.ts
// Barrel for the shared premium layer. Arqavellum's MobilePremium kit consumes
// these primitives — there's no DesktopPremium kit (PWA-first).

export {
  FadeIn,
  Shake,
  Crossfade,
  usePressedStyle,
  useFocusRing,
  pressStyle,
  RESPOND_PRESSED,
  prefersReducedMotionSync,
  useReducedMotion,
  Pressable,
} from './Motion';
export type {
  FadeInProps,
  ShakeProps,
  CrossfadeProps,
  UseFocusRingOptions,
} from './Motion';

export { PALETTES } from './atmospherePalettes';
export type { AtmosphereSurface, AtmospherePalette } from './atmospherePalettes';
