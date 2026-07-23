// hooks/useShimmer.ts
// Looping opacity wave for skeleton placeholders. Returns an Animated.Value
// that pulses 1.0 → 0.5 → 1.0 over 1200ms indefinitely; SkeletonBlock
// consumes it via <Animated.View style={{ opacity }}>.
//
// Reduces to a static opacity=1 when the user has
// `prefers-reduced-motion: reduce` set — the placeholder stays visible
// as a flat block without the pulse.
//
// Standalone hook (not coupled to any feature module). A general-purpose
// animation shouldn't drag a feature dependency into every consumer.

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useReducedMotion } from './useAnimation';

export interface UseShimmerOptions {
  /** Pulse cycle duration in ms. Default 1200. */
  duration?: number;
  /** Floor opacity reached mid-pulse. Default 0.5. */
  minOpacity?: number;
}

/**
 * Drives the shimmer pulse. Caller MUST attach the returned value to an
 * Animated node (typically `<Animated.View style={{ opacity }}>`); leaving
 * it unattached leaks the running loop until unmount.
 */
export function useShimmer({
  duration = 1200,
  minOpacity = 0.5,
}: UseShimmerOptions = {}): Animated.Value {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      // Reduced-motion mode: hold at fully visible. Still call setValue
      // in case a prior loop left the value mid-pulse (HMR / dynamic
      // preference flip).
      opacity.setValue(1);
      return;
    }

    const half = duration / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: minOpacity,
          duration: half,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: half,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [opacity, reducedMotion, duration, minOpacity]);

  return opacity;
}

export default useShimmer;
