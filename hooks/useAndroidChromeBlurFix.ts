// hooks/useAndroidChromeBlurFix.ts
// Detects Android Chrome so MobileSurface can swap to a near-solid
// background + milder blur (Android Chrome falsely reports backdrop-filter
// support while rendering saturate() poorly). Arqavellum ships a conservative
// stub — consumers with significant Android traffic should replace this
// with a fuller detection scheme.

import { useMemo } from 'react';
import { Platform } from 'react-native';
import { isWeb, hasWindow } from '../utils';

export interface UseAndroidChromeBlurFixReturn {
  isAndroidChrome: boolean;
  /**
   * Whether the standard backdrop-filter path is safe to use. Arqavellum
   * returns true for everything except detected Android Chrome (which
   * would otherwise render the blur illegibly).
   */
  supportsBackdropFilter: boolean;
}

export function useAndroidChromeBlurFix(): UseAndroidChromeBlurFixReturn {
  return useMemo(() => {
    if (!isWeb || !hasWindow()) {
      return { isAndroidChrome: false, supportsBackdropFilter: false };
    }
    const ua = window.navigator?.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isChrome = /chrome\/\d+/i.test(ua) && !/edg\/\d+/i.test(ua);
    const isAndroidChrome = isAndroid && isChrome;
    return {
      isAndroidChrome,
      supportsBackdropFilter: !isAndroidChrome,
    };
  }, []);
}

export default useAndroidChromeBlurFix;
