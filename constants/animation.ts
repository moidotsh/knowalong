// constants/animation.ts
// Centralized animation configuration. Domain-agnostic — every consumer
// inherits the same motion language. Used across hooks and components for
// consistent animation behavior.

import { RESIZE_DEBOUNCE_MS } from './breakpoints';

export const DURATION = {
  instant: 50,
  quick: 80,
  fast: 100,
  normal: 200,
  default: 300,
  moderate: 400,
  celebration: 500,
  colorTransition: 600,
  slow: 800,
  second: 1000,
  extended: 1500,
  data: 1600,
  crossfade: 2000,
  long: 4000,
} as const;

export const ANIMATION_CONFIG = {
  mountDelay: 100,
  spring: {
    default: { friction: 3, tension: 100 },
    activation: { friction: 2, tension: 80 },
  },
  dataAnimation: {
    duration: DURATION.data,
    delay: DURATION.colorTransition,
  },
} as const;

export const RESIZE_MEASUREMENT_DEBOUNCE = RESIZE_DEBOUNCE_MS;

// Long-press interaction tuning. Used by MobileStepper and any other
// primitive that accelerates on press-and-hold.
export const ANIMATION = {
  /** Delay before a press-and-hold starts accelerating (ms). */
  LONG_PRESS_DELAY: 400,
  /** Repeat interval once acceleration kicks in (ms). */
  FAST_INTERVAL: 80,
} as const;
