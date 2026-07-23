// hooks/useFadeSlide.ts
// Combined fade + slide entrance animation. Powers FadeIn in the premium
// motion layer. Reduces 6+ lines of Animated.timing boilerplate per
// mounting element to one hook call.

import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { isWeb } from '../utils';
import { DURATION } from '../constants';

export interface UseFadeSlideOptions {
  duration?: number;
  delay?: number;
  initialTranslate?: number;
  initialOpacity?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  animateOnMount?: boolean;
}

export interface UseFadeSlideReturn {
  opacity: Animated.Value;
  translate: Animated.Value;
  style: {
    opacity: Animated.Value;
    transform: Array<{ translateY: Animated.Value } | { translateX: Animated.Value }>;
  };
  animate: () => void;
  reset: () => void;
}

export function useFadeSlide(options: UseFadeSlideOptions = {}): UseFadeSlideReturn {
  const {
    duration = DURATION.moderate,
    delay = 0,
    initialTranslate = 20,
    initialOpacity = 0,
    direction = 'up',
    animateOnMount = true,
  } = options;

  const opacity = useRef(new Animated.Value(initialOpacity)).current;
  const translate = useRef(new Animated.Value(initialTranslate)).current;

  const animate = useCallback(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: !isWeb,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: !isWeb,
        }),
      ]),
    ]);
    animation.start();
    return animation;
  }, [opacity, translate, duration, delay]);

  const reset = useCallback(() => {
    opacity.setValue(initialOpacity);
    translate.setValue(initialTranslate);
  }, [opacity, translate, initialOpacity, initialTranslate]);

  useEffect(() => {
    if (animateOnMount) {
      animate();
    }
  }, [animateOnMount, animate]);

  const isVertical = direction === 'up' || direction === 'down';
  const transform = isVertical
    ? [{ translateY: translate }]
    : [{ translateX: translate }];

  return {
    opacity,
    translate,
    style: { opacity, transform },
    animate,
    reset,
  };
}

export default useFadeSlide;
