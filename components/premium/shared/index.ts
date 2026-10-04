// components/premium/shared/index.ts
// Barrel for the shared premium layer. Arqavellum's MobilePremium kit consumes
// these primitives — there's no DesktopPremium kit (PWA-first).

export {
  FadeIn,
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
  CrossfadeProps,
  UseFocusRingOptions,
} from './Motion';

export { PALETTES } from './atmospherePalettes';
export type { AtmosphereSurface, AtmospherePalette } from './atmospherePalettes';

export { useCompressFade } from './useCompressFade';
export type { UseCompressFadeResult } from './useCompressFade';
export { useDialogFocus } from './useDialogFocus';
export { useDismissOnEscape } from './useDismissOnEscape';
export { useFieldChrome, FIELD_GROUP_STYLE } from './useFieldChrome';
export type { FieldChrome, FieldChromeOptions } from './useFieldChrome';
export {
  useAnimatedValue,
  useTransition,
  useAnimatedFlag,
  useLoop,
  animateTo,
} from './useAnimatedValue';
export type {
  TransitionOptions,
  AnimatedFlagOptions,
  LoopStep,
  LoopOptions,
  AnimationDriver,
} from './useAnimatedValue';
