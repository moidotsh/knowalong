// hooks/useTranslateAnimation.ts
// Reusable 1-D translate animations — eliminates the
// `useRef(new Animated.Value(...)) + useEffect(timing)` boilerplate for
// the common entrance/exit translate pattern.
//
// For combined fade+slide entrances, prefer useFadeSlide.ts (already in
// this repo) — it parallelizes opacity + translate in a single animation.

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

/**
 * Options for translate animation.
 */
export interface TranslateAnimationOptions {
  /** Animation duration in ms (default: DURATION.moderate) */
  duration?: number;
  /** Delay before animation starts in ms (default: 0) */
  delay?: number;
  /** Initial translate value (default: 20 for Y, 0 for X) */
  initialValue?: number;
  /** Final translate value (default: 0) */
  finalValue?: number;
  /** Whether to animate on mount (default: true) */
  animateOnMount?: boolean;
  /** Easing function (default: Easing.out(Easing.ease)) */
  easing?: (value: number) => number;
}

/**
 * Return type for useTranslateY hook.
 */
export interface UseTranslateYReturn {
  /** Animated translate Y value */
  translateY: Animated.Value;
  /** Style object with transform — spread onto an Animated.View */
  style: { transform: [{ translateY: Animated.Value }] };
  /** Start the animation manually */
  animate: () => void;
  /** Reset to initial value */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for translateY animations (commonly paired with fade for entrances).
 *
 * @example
 * const { style } = useTranslateY();
 * return <Animated.View style={style}>...</Animated.View>;
 */
export function useTranslateY(options: TranslateAnimationOptions = {}): UseTranslateYReturn {
  const {
    duration = DURATION.moderate,
    delay = 0,
    initialValue = 20,
    finalValue = 0,
    animateOnMount = true,
    easing = Easing.out(Easing.ease),
  } = options;

  const translateY = useRef(new Animated.Value(initialValue)).current;

  const animate = useCallback(() => {
    const animation = Animated.timing(translateY, {
      toValue: finalValue,
      duration,
      delay,
      easing,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return animation;
  }, [translateY, duration, delay, easing, finalValue]);

  const reset = useCallback(() => {
    translateY.setValue(initialValue);
  }, [translateY, initialValue]);

  useEffect(() => {
    if (animateOnMount) {
      animate();
    }
  }, [animateOnMount, animate]);

  return {
    translateY,
    style: { transform: [{ translateY }] },
    animate,
    reset,
    animatedValue: translateY,
  };
}

/**
 * Return type for useTranslateX hook.
 */
export interface UseTranslateXReturn {
  /** Animated translate X value */
  translateX: Animated.Value;
  /** Style object with transform — spread onto an Animated.View */
  style: { transform: [{ translateX: Animated.Value }] };
  /** Start the animation manually */
  animate: () => void;
  /** Reset to initial value */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for translateX animations (slide-in/slide-out horizontally).
 */
export function useTranslateX(options: TranslateAnimationOptions = {}): UseTranslateXReturn {
  const {
    duration = DURATION.moderate,
    delay = 0,
    initialValue = 0,
    finalValue = 0,
    animateOnMount = true,
    easing = Easing.out(Easing.ease),
  } = options;

  const translateX = useRef(new Animated.Value(initialValue)).current;

  const animate = useCallback(() => {
    const animation = Animated.timing(translateX, {
      toValue: finalValue,
      duration,
      delay,
      easing,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return animation;
  }, [translateX, duration, delay, easing, finalValue]);

  const reset = useCallback(() => {
    translateX.setValue(initialValue);
  }, [translateX, initialValue]);

  useEffect(() => {
    if (animateOnMount) {
      animate();
    }
  }, [animateOnMount, animate]);

  return {
    translateX,
    style: { transform: [{ translateX }] },
    animate,
    reset,
    animatedValue: translateX,
  };
}

export default useTranslateY;
