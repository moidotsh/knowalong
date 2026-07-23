// hooks/useFadeAnimation.ts
// Reusable fade animation hooks to eliminate useRef(new Animated.Value(...))
// boilerplate. Three flavors: one-shot fade-in, one-shot fade-out, and a
// toggleable fade for show/hide UI.
//
// `useNativeDriver` is `!isWeb` because native animation offloading is
// free on iOS/Android but janks on React Native Web.

import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

/**
 * Options for fade animation
 */
export interface FadeAnimationOptions {
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Delay before animation starts in ms (default: 0) */
  delay?: number;
  /** Initial opacity value (default: 0) */
  initialOpacity?: number;
  /** Final opacity value (default: 1) */
  finalOpacity?: number;
  /** Whether to animate on mount (default: true) */
  animateOnMount?: boolean;
  /** Easing function (default: ease-out) */
  easing?: (value: number) => number;
}

/**
 * Return type for useFadeIn hook
 */
export interface UseFadeInReturn {
  /** Animated opacity value */
  opacity: Animated.Value;
  /** Style object with opacity */
  style: { opacity: Animated.Value };
  /** Start the fade in animation manually */
  fadeIn: () => void;
  /** Reset to initial opacity */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for fade-in animations
 *
 * Replaces the common pattern:
 * ```tsx
 * // Before:
 * const opacity = useRef(new Animated.Value(0)).current;
 * useEffect(() => {
 *   Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: !isWeb }).start();
 * }, []);
 *
 * // After:
 * const { style } = useFadeIn();
 * return <Animated.View style={style}>...</Animated.View>;
 * ```
 */
export function useFadeIn(options: FadeAnimationOptions = {}): UseFadeInReturn {
  const {
    duration = DURATION.default,
    delay = 0,
    initialOpacity = 0,
    finalOpacity = 1,
    animateOnMount = true,
    easing = Easing.out(Easing.ease),
  } = options;

  const opacity = useRef(new Animated.Value(initialOpacity)).current;

  const fadeIn = useCallback(() => {
    const animation = Animated.timing(opacity, {
      toValue: finalOpacity,
      duration,
      delay,
      easing,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return animation;
  }, [opacity, duration, delay, easing, finalOpacity]);

  const reset = useCallback(() => {
    opacity.setValue(initialOpacity);
  }, [opacity, initialOpacity]);

  useEffect(() => {
    if (animateOnMount) {
      fadeIn();
    }
  }, [animateOnMount, fadeIn]);

  return {
    opacity,
    style: { opacity },
    fadeIn,
    reset,
    animatedValue: opacity,
  };
}

/**
 * Return type for useFadeOut hook
 */
export interface UseFadeOutReturn {
  /** Animated opacity value */
  opacity: Animated.Value;
  /** Style object with opacity */
  style: { opacity: Animated.Value };
  /** Start the fade out animation manually */
  fadeOut: () => void;
  /** Reset to initial opacity */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for fade-out animations (starts visible, fades to invisible)
 */
export function useFadeOut(options: FadeAnimationOptions = {}): UseFadeOutReturn {
  const {
    duration = DURATION.default,
    delay = 0,
    initialOpacity = 1,
    finalOpacity = 0,
    easing = Easing.out(Easing.ease),
  } = options;

  const opacity = useRef(new Animated.Value(initialOpacity)).current;

  const fadeOut = useCallback(() => {
    const animation = Animated.timing(opacity, {
      toValue: finalOpacity,
      duration,
      delay,
      easing,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return animation;
  }, [opacity, duration, delay, easing, finalOpacity]);

  const reset = useCallback(() => {
    opacity.setValue(initialOpacity);
  }, [opacity, initialOpacity]);

  return {
    opacity,
    style: { opacity },
    fadeOut,
    reset,
    animatedValue: opacity,
  };
}

/**
 * Options for fade transition (toggle between visible/hidden)
 */
export interface UseFadeToggleOptions extends FadeAnimationOptions {
  /** Initial visibility state (default: false) */
  initialVisible?: boolean;
}

/**
 * Return type for useFadeToggle hook
 */
export interface UseFadeToggleReturn {
  /** Animated opacity value */
  opacity: Animated.Value;
  /** Style object with opacity */
  style: { opacity: Animated.Value };
  /** Current visibility state */
  visible: boolean;
  /** Toggle visibility */
  toggle: () => void;
  /** Show (fade in) */
  show: () => void;
  /** Hide (fade out) */
  hide: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for toggleable fade animations
 */
export function useFadeToggle(options: UseFadeToggleOptions = {}): UseFadeToggleReturn {
  const {
    duration = DURATION.default,
    initialVisible = false,
  } = options;

  const opacity = useRef(new Animated.Value(initialVisible ? 1 : 0)).current;
  const [visible, setVisible] = useState(initialVisible);

  const animate = useCallback((toValue: number) => {
    Animated.timing(opacity, {
      toValue,
      duration,
      useNativeDriver: !isWeb,
    }).start();
  }, [opacity, duration]);

  const show = useCallback(() => {
    setVisible(true);
    animate(1);
  }, [animate]);

  const hide = useCallback(() => {
    setVisible(false);
    animate(0);
  }, [animate]);

  const toggle = useCallback(() => {
    if (visible) {
      hide();
    } else {
      show();
    }
  }, [visible, show, hide]);

  return {
    opacity,
    style: { opacity },
    visible,
    toggle,
    show,
    hide,
    animatedValue: opacity,
  };
}

export default useFadeIn;
