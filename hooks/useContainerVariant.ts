// hooks/useContainerVariant.ts
// Adaptive container variant detection — returns 'compact' | 'medium' |
// 'full' based on the container's measured aspect ratio + height. Use
// this for card-style components whose layout adapts to available space.
//
// Distinct from getComponentVariant() in constants/breakpoints.ts, which
// is width-only and synchronous. This hook runs a container query and
// considers aspect ratio + height — the right call when a card has
// meaningfully different layouts at the same width but different heights.

import { useMemo, type RefObject } from 'react';
import { useContainerQuery } from './useContainerQuery';

/**
 * Variant type — same shape as ComponentVariant in breakpoints.ts but
 * computed via aspect-ratio + height rather than width alone.
 */
export type ContainerVariant = 'compact' | 'medium' | 'full';

/**
 * Threshold configuration for variant detection.
 */
export interface VariantThresholds {
  /** Aspect ratio above this triggers compact mode (wide and short) */
  compactAspectRatio: number;
  /** Height below this triggers compact mode */
  compactHeight: number;
  /** Aspect ratio below this triggers full mode (tall and narrow) */
  fullAspectRatio: number;
  /** Height above this triggers full mode */
  fullHeight: number;
}

/**
 * Fixed heights for each variant — returned alongside `variant` so
 * callers can apply a deterministic height that matches the variant.
 */
export interface VariantHeights {
  compact: number;
  medium: number;
  full: number;
}

/**
 * Complete configuration for the variant hook.
 */
export interface VariantConfig {
  thresholds: VariantThresholds;
  heights: VariantHeights;
}

/**
 * Default threshold configuration — works for most card-style components.
 */
export const DEFAULT_VARIANT_THRESHOLDS: VariantThresholds = {
  compactAspectRatio: 3,
  compactHeight: 40,
  fullAspectRatio: 1.5,
  fullHeight: 80,
};

/**
 * Preset configurations for common use cases.
 *
 * For width-only variant detection, use getComponentVariant() from
 * breakpoints.ts which uses COMPONENT_VARIANT_THRESHOLDS. The two systems
 * cover different cases — width-only is for buttons/tiles; aspect+height
 * is for cards whose height can vary independently of width.
 *
 * Arqavellum ships `default`, `compact`, and `card` presets. Consumers add
 * their own presets in domain code; the shape is stable.
 */
export const VARIANT_PRESETS = {
  /** Default preset — works for most cards */
  default: {
    thresholds: DEFAULT_VARIANT_THRESHOLDS,
    heights: { compact: 36, medium: 60, full: 90 },
  },
  /** Smaller preset — for compact cards */
  compact: {
    thresholds: {
      compactAspectRatio: 3,
      compactHeight: 35,
      fullAspectRatio: 1.5,
      fullHeight: 70,
    },
    heights: { compact: 32, medium: 50, full: 80 },
  },
  /** Tall card preset — when the card is expected to stretch vertically */
  card: {
    thresholds: {
      compactAspectRatio: 3,
      compactHeight: 45,
      fullAspectRatio: 1.5,
      fullHeight: 75,
    },
    heights: { compact: 36, medium: 60, full: 90 },
  },
} as const;

/**
 * Compute variant from dimensions + thresholds. Pure function — exported
 * for unit tests and one-off calculations without mounting a hook.
 */
export function computeContainerVariant(
  width: number,
  height: number,
  thresholds: VariantThresholds = DEFAULT_VARIANT_THRESHOLDS,
): ContainerVariant {
  if (height <= 0 || width <= 0) return 'medium';

  const aspectRatio = width / height;

  if (aspectRatio > thresholds.compactAspectRatio || height < thresholds.compactHeight) {
    return 'compact';
  }

  if (aspectRatio < thresholds.fullAspectRatio || height > thresholds.fullHeight) {
    return 'full';
  }

  return 'medium';
}

/**
 * Hook to determine container variant based on aspect ratio and height.
 *
 * @param containerRef - Reference to the container element to measure
 * @param config - Configuration (thresholds + heights), or a preset key
 * @returns `{ variant, fixedHeight, width, height }`
 *
 * @example
 * // Using a preset
 * const containerRef = useRef(null);
 * const { variant, fixedHeight } = useContainerVariant(containerRef, 'card');
 *
 * @example
 * // Custom config
 * const { variant } = useContainerVariant(containerRef, {
 *   thresholds: { compactAspectRatio: 4, compactHeight: 30, fullAspectRatio: 1.2, fullHeight: 100 },
 *   heights: { compact: 28, medium: 50, full: 120 },
 * });
 */
export function useContainerVariant(
  containerRef: RefObject<unknown>,
  config: VariantConfig | keyof typeof VARIANT_PRESETS = 'default',
): {
  variant: ContainerVariant;
  fixedHeight: number;
  width: number;
  height: number;
} {
  const resolvedConfig: VariantConfig =
    typeof config === 'string' ? VARIANT_PRESETS[config] : config;

  const { width, height } = useContainerQuery(containerRef);

  const variant = useMemo(
    () => computeContainerVariant(width, height, resolvedConfig.thresholds),
    [width, height, resolvedConfig.thresholds],
  );

  const fixedHeight = resolvedConfig.heights[variant];

  return { variant, fixedHeight, width, height };
}
