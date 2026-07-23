// hooks/useShakeAnimation.ts
// Imperative shake animation — fire on demand (e.g. validation error).
//
// Complements useControlledShake.ts, which fires in response to a boolean
// trigger. Use useShake when the caller owns the call site (imperative
// "shake now"), use useControlledShake when the caller only owns the state
// ("shouldShake became true").

import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

/**
 * Options for shake animation.
 */
export interface ShakeAnimationOptions {
  /** Shake intensity in pixels (default: 10) */
  intensity?: number;
  /** Duration of each shake step in ms (default: DURATION.instant) */
  stepDuration?: number;
  /** Number of shake cycles (default: 3) */
  cycles?: number;
}

/**
 * Return type for useShake hook.
 */
export interface UseShakeReturn {
  /** Animated shake value */
  shakeAnim: Animated.Value;
  /** Style object with transform — spread onto an Animated.View */
  style: { transform: [{ translateX: Animated.Value }] };
  /** Trigger the shake animation */
  shake: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for shake/wiggle animations (commonly used for error feedback).
 *
 * @example
 * const { style, shake } = useShake();
 * // ...later, on validation error:
 * shake();
 * return <Animated.View style={style}>...</Animated.View>;
 */
export function useShake(options: ShakeAnimationOptions = {}): UseShakeReturn {
  const {
    intensity = 10,
    stepDuration = DURATION.instant,
    cycles = 3,
  } = options;

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    // Create shake sequence: right, left, right, left, ... settle at 0.
    // Intensity decays each cycle so the shake fades naturally.
    const sequence: Animated.CompositeAnimation[] = [];

    for (let i = 0; i < cycles; i++) {
      const currentIntensity = intensity * (1 - i * 0.2);
      sequence.push(
        Animated.timing(shakeAnim, {
          toValue: currentIntensity,
          duration: stepDuration,
          useNativeDriver: !isWeb,
        }),
        Animated.timing(shakeAnim, {
          toValue: -currentIntensity,
          duration: stepDuration,
          useNativeDriver: !isWeb,
        }),
      );
    }

    // Final settle to 0.
    sequence.push(
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: stepDuration,
        useNativeDriver: !isWeb,
      }),
    );

    Animated.sequence(sequence).start();
  }, [shakeAnim, intensity, stepDuration, cycles]);

  return {
    shakeAnim,
    style: { transform: [{ translateX: shakeAnim }] },
    shake,
    animatedValue: shakeAnim,
  };
}

export default useShake;
