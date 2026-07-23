// hooks/useAnimatedCounter.ts
// Animates a displayed numeric string from an old value to a new value
// using requestAnimationFrame and an ease-out cubic curve.
//
// Domain-agnostic: callers pass their own format function (e.g., formatting
// the displayed numeric string). The hook handles only the animation curve.

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Manages an animated counter display for a numeric string value.
 * Normally syncs with `currentValue`, but `startCount()` smoothly
 * increments/decrements from an old value to the new one.
 */
export function useAnimatedCounter(currentValue: string) {
  const [displayed, setDisplayed] = useState(currentValue);
  const rafRef = useRef<number | null>(null);
  const isAnimating = useRef(false);

  // Keep displayed in sync when value changes outside of animation
  useEffect(() => {
    if (!isAnimating.current) {
      setDisplayed(currentValue);
    }
  }, [currentValue]);

  const startCount = useCallback((
    fromValue: string,
    toValue: string,
    formatFn: (value: number) => string,
    onComplete?: () => void,
    duration = 800,
  ) => {
    const from = parseFloat(fromValue);
    const to = parseFloat(toValue);

    if (isNaN(from) || isNaN(to) || from === to) {
      setDisplayed(toValue);
      onComplete?.();
      return;
    }

    isAnimating.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();

    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplayed(formatFn(current));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        isAnimating.current = false;
        setDisplayed(toValue);
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { displayed, startCount };
}

export default useAnimatedCounter;
