// hooks/useControlledShake.ts
// Controlled shake for error feedback. Fires when `trigger` flips true;
// calls `onComplete` when the sequence finishes so the caller can reset
// the trigger. Used by the <Shake> primitive in the premium motion layer.

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

export interface UseControlledShakeOptions {
  trigger: boolean;
  onComplete?: () => void;
  intensity?: number;
  stepDuration?: number;
  cycles?: number;
}

export interface UseControlledShakeReturn {
  shakeAnim: Animated.Value;
  style: { transform: [{ translateX: Animated.Value }] };
  animatedValue: Animated.Value;
}

export function useControlledShake(options: UseControlledShakeOptions): UseControlledShakeReturn {
  const {
    trigger,
    onComplete,
    intensity = 10,
    stepDuration = DURATION.instant,
  } = options;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  // Stable callback ref so the effect doesn't re-run on every onComplete change.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      const sequence = Animated.sequence([
        Animated.timing(shakeAnim, { toValue: intensity, duration: stepDuration, useNativeDriver: !isWeb }),
        Animated.timing(shakeAnim, { toValue: -intensity, duration: stepDuration, useNativeDriver: !isWeb }),
        Animated.timing(shakeAnim, { toValue: intensity, duration: stepDuration, useNativeDriver: !isWeb }),
        Animated.timing(shakeAnim, { toValue: -intensity, duration: stepDuration, useNativeDriver: !isWeb }),
        Animated.timing(shakeAnim, { toValue: intensity * 0.6, duration: stepDuration, useNativeDriver: !isWeb }),
        Animated.timing(shakeAnim, { toValue: 0, duration: stepDuration, useNativeDriver: !isWeb }),
      ]);
      sequence.start(() => {
        onCompleteRef.current?.();
      });
      return () => {
        sequence.stop();
      };
    }
  }, [trigger, shakeAnim, intensity, stepDuration]);

  return {
    shakeAnim,
    style: { transform: [{ translateX: shakeAnim }] },
    animatedValue: shakeAnim,
  };
}

export default useControlledShake;
