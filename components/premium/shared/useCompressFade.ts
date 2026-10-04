// components/premium/shared/useCompressFade.ts
//
// THE COMPRESS FADE (the shared motion primitive behind compact
// restatement bars): a fade value that runs 0 while a page's hero
// statement is on screen and 1 once it has scrolled one runway past.
// Scaffolds mount a compact bar whose opacity reads this value — the
// big words hand off to the carried words.
//
// Contracts: transform/opacity only, no layout properties; DOM-safe
// (the Animated.Value exists everywhere, the listener only updates
// where scroll fires); under reduced motion — or off-web — the
// consumer renders its restatement statically at full opacity, so
// the design is complete without the fade.

import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { isWeb } from '../../../utils';
import { useReducedMotion } from './Motion';

/** How far the scroller travels from "hero visible" to "hero gone". */
const COMPRESS_RUNWAY = 56;

export interface UseCompressFadeResult {
  /** 0 (hero on screen) → 1 (hero scrolled past). Static-eligible. */
  compress: Animated.Value;
  /**
   * Forward to the ScrollView's onScroll (chains after any consumer
   * handler): `onScroll={compressFade.handleScroll}`.
   */
  handleScroll: ReturnType<typeof useCallback>;
  /** True when the fade must NOT animate (render statically). */
  static: boolean;
}

export function useCompressFade(enabled: boolean): UseCompressFadeResult {
  const reduced = useReducedMotion();
  const compress = useRef(new Animated.Value(reduced || !isWeb || !enabled ? 1 : 0)).current;
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!enabled || reduced || !isWeb) return;
      compress.setValue(
        Math.max(0, Math.min(1, e.nativeEvent.contentOffset.y / COMPRESS_RUNWAY)),
      );
    },
    [enabled, reduced, compress],
  );
  return { compress, handleScroll, static: reduced || !isWeb };
}
