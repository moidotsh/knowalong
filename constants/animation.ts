// constants/animation.ts
// Centralized animation configuration — the motion-language tokens.
// Domain-agnostic: every consumer inherits the same durations and curves.
// Components may keep deliberate per-primitive tuning as explicit local
// numbers (considered motion); tokens exist for the values that recur.

import { Easing } from 'react-native';

export const DURATION = {
  instant: 50,
  fast: 100,
  /** One crisp state flip with a hint of motion — checks, strikes. */
  strike: 120,
  normal: 200,
  default: 300,
  moderate: 400,
  /** Ambient loop periods. */
  pulse: 800,
  drift: 12000,
} as const;

/**
 * The motion language's named curves. Enter moves ease-out (arriving),
 * exits ease-in (leaving), the plate language passes through
 * (in-out quad), and the overshoots carry back-off for pop/strike.
 */
export const EASING = {
  enter: Easing.out(Easing.ease),
  exit: Easing.in(Easing.ease),
  outCubic: Easing.out(Easing.cubic),
  inOutQuad: Easing.inOut(Easing.quad),
  /** Generic pop-in overshoot (usePopIn and friends). */
  overshoot: Easing.out(Easing.back(1.5)),
  /** The curtain's plate strike — a stiffer back-off than overshoot. */
  strike: Easing.out(Easing.back(1.15)),
} as const;

export const ANIMATION_CONFIG = {
  mountDelay: 100,
} as const;

// Long-press interaction tuning. Used by MobileStepper and any other
// primitive that accelerates on press-and-hold.
export const ANIMATION = {
  /** Delay before a press-and-hold starts accelerating (ms). */
  LONG_PRESS_DELAY: 400,
  /** Repeat interval once acceleration kicks in (ms). */
  FAST_INTERVAL: 80,
} as const;
