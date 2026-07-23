// hooks/useAnimation.ts
// Reduced-motion detection. This is the load-bearing accessibility hook —
// every motion primitive in components/premium/shared/Motion.tsx calls
// useReducedMotion() and collapses to a no-slide / no-drift variant when
// the user has prefers-reduced-motion: reduce set.

import { useEffect, useState } from 'react';
import { isWeb, hasWindow } from '../utils';

export function checkReducedMotionPreference(): boolean {
  if (!isWeb || !hasWindow()) return false;
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => checkReducedMotionPreference());

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return reducedMotion;
}

export default useReducedMotion;
