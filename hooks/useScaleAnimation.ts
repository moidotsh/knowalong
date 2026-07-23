// hooks/useScaleAnimation.ts
// Reusable scale animation hooks to eliminate useRef(new Animated.Value(...))
// boilerplate. Four flavors: scale-in, scale-out, button-press scale,
// and a pop-in overshoot-settle.
//
// Reusable scale animation hooks to eliminate useRef(new Animated.Value(...))
// boilerplate. Four flavors: scale-in, scale-out, button-press scale,
// and a pop-in overshoot-settle.

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

/**
 * Options for scale animation
 */
export interface ScaleAnimationOptions {
  /** Animation duration in ms (default: 200) */
  duration?: number;
  /** Delay before animation starts in ms (default: 0) */
  delay?: number;
  /** Initial scale value (default: 0) */
  initialScale?: number;
  /** Final scale value (default: 1) */
  finalScale?: number;
  /** Whether to animate on mount (default: true) */
  animateOnMount?: boolean;
  /** Easing function (default: ease-out) */
  easing?: (value: number) => number;
  /** Use spring physics instead of timing (default: false) */
  useSpring?: boolean;
  /** Spring config (if useSpring is true) */
  springConfig?: {
    friction?: number;
    tension?: number;
  };
}

/**
 * Return type for useScaleIn hook
 */
export interface UseScaleInReturn {
  /** Animated scale value */
  scale: Animated.Value;
  /** Style object with transform */
  style: { transform: [{ scale: Animated.Value }] };
  /** Start the scale in animation manually */
  scaleIn: () => void;
  /** Reset to initial scale */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for scale-in animations
 *
 * Replaces the common pattern:
 * ```tsx
 * // Before:
 * const scale = useRef(new Animated.Value(0)).current;
 * useEffect(() => {
 *   Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: !isWeb }).start();
 * }, []);
 *
 * // After:
 * const { style } = useScaleIn({ useSpring: true });
 * return <Animated.View style={style}>...</Animated.View>;
 * ```
 */
export function useScaleIn(options: ScaleAnimationOptions = {}): UseScaleInReturn {
  const {
    duration = DURATION.normal,
    delay = 0,
    initialScale = 0,
    finalScale = 1,
    animateOnMount = true,
    easing = Easing.out(Easing.back(1.5)),
    useSpring = false,
    springConfig = { friction: 7, tension: 100 },
  } = options;

  const scale = useRef(new Animated.Value(initialScale)).current;

  const scaleIn = useCallback(() => {
    let animation: Animated.CompositeAnimation;

    if (useSpring) {
      animation = Animated.spring(scale, {
        toValue: finalScale,
        friction: springConfig.friction ?? 7,
        tension: springConfig.tension ?? 100,
        useNativeDriver: !isWeb,
      });
    } else {
      animation = Animated.timing(scale, {
        toValue: finalScale,
        duration,
        delay,
        easing,
        useNativeDriver: !isWeb,
      });
    }

    animation.start();
    return animation;
  }, [scale, duration, delay, easing, finalScale, useSpring, springConfig]);

  const reset = useCallback(() => {
    scale.setValue(initialScale);
  }, [scale, initialScale]);

  useEffect(() => {
    if (animateOnMount) {
      scaleIn();
    }
  }, [animateOnMount, scaleIn]);

  return {
    scale,
    style: { transform: [{ scale }] },
    scaleIn,
    reset,
    animatedValue: scale,
  };
}

/**
 * Return type for useScaleOut hook
 */
export interface UseScaleOutReturn {
  /** Animated scale value */
  scale: Animated.Value;
  /** Style object with transform */
  style: { transform: [{ scale: Animated.Value }] };
  /** Start the scale out animation manually */
  scaleOut: () => void;
  /** Reset to initial scale */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for scale-out animations (starts at normal size, shrinks)
 */
export function useScaleOut(options: ScaleAnimationOptions = {}): UseScaleOutReturn {
  const {
    duration = DURATION.normal,
    initialScale = 1,
    finalScale = 0,
    easing = Easing.in(Easing.ease),
  } = options;

  const scale = useRef(new Animated.Value(initialScale)).current;

  const scaleOut = useCallback(() => {
    const animation = Animated.timing(scale, {
      toValue: finalScale,
      duration,
      easing,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return animation;
  }, [scale, duration, easing, finalScale]);

  const reset = useCallback(() => {
    scale.setValue(initialScale);
  }, [scale, initialScale]);

  return {
    scale,
    style: { transform: [{ scale }] },
    scaleOut,
    reset,
    animatedValue: scale,
  };
}

/**
 * Options for scale press (button press effect)
 */
export interface UseScalePressOptions {
  /** Scale value when pressed (default: 0.95) */
  pressScale?: number;
  /** Animation duration (default: 100) */
  duration?: number;
}

/**
 * Return type for useScalePress hook
 */
export interface UseScalePressReturn {
  /** Animated scale value */
  scale: Animated.Value;
  /** Style object with transform */
  style: { transform: [{ scale: Animated.Value }] };
  /** Call on press in */
  onPressIn: () => void;
  /** Call on press out */
  onPressOut: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for button press scale animations
 *
 * Usage:
 * ```tsx
 * const { style, onPressIn, onPressOut } = useScalePress();
 * return (
 *   <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *     <Animated.View style={style}>...</Animated.View>
 *   </Pressable>
 * );
 * ```
 */
export function useScalePress(options: UseScalePressOptions = {}): UseScalePressReturn {
  const {
    pressScale = 0.95,
    duration = DURATION.fast,
  } = options;

  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: pressScale,
      duration,
      useNativeDriver: !isWeb,
    }).start();
  }, [scale, pressScale, duration]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: !isWeb,
    }).start();
  }, [scale]);

  return {
    scale,
    style: { transform: [{ scale }] },
    onPressIn,
    onPressOut,
    animatedValue: scale,
  };
}

/**
 * Options for pop-in animation (overshoot and settle)
 */
export interface UsePopInOptions {
  /** Animation duration (default: 400) */
  duration?: number;
  /** Whether to animate on mount (default: true) */
  animateOnMount?: boolean;
  /** Overshoot scale (default: 1.1) */
  overshoot?: number;
}

/**
 * Return type for usePopIn hook
 */
export interface UsePopInReturn {
  /** Animated scale value */
  scale: Animated.Value;
  /** Style object with transform */
  style: { transform: [{ scale: Animated.Value }] };
  /** Start the pop animation manually */
  popIn: () => void;
  /** Reset to initial scale */
  reset: () => void;
  /** Animated value for chaining */
  animatedValue: Animated.Value;
}

/**
 * Hook for pop-in animation with overshoot effect
 */
export function usePopIn(options: UsePopInOptions = {}): UsePopInReturn {
  const {
    duration = DURATION.moderate,
    animateOnMount = true,
    overshoot = 1.1,
  } = options;

  const scale = useRef(new Animated.Value(0)).current;

  const popIn = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: overshoot,
        duration: duration * 0.6,
        useNativeDriver: !isWeb,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: !isWeb,
      }),
    ]).start();
  }, [scale, duration, overshoot]);

  const reset = useCallback(() => {
    scale.setValue(0);
  }, [scale]);

  useEffect(() => {
    if (animateOnMount) {
      popIn();
    }
  }, [animateOnMount, popIn]);

  return {
    scale,
    style: { transform: [{ scale }] },
    popIn,
    reset,
    animatedValue: scale,
  };
}

export default useScaleIn;
