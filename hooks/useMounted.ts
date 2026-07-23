// hooks/useMounted.ts
// Returns true after the component has completed initial render and the
// browser has had time to settle. Used to prevent mount-time animations
// that cause visual "wiggle" on navigation.

import { useState, useEffect } from 'react';
import { ANIMATION_CONFIG } from '../constants';

/**
 * @param delayMs - Delay before returning true (default from ANIMATION_CONFIG.mountDelay).
 * @returns boolean indicating whether the component is "mounted" and settled.
 */
export function useMounted(delayMs: number = ANIMATION_CONFIG.mountDelay): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return mounted;
}

export default useMounted;
