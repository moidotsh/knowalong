// hooks/usePlatformAnimation.ts
// Centralized platform-aware animation config. Eliminates the repetitive
// `useNativeDriver: !isWeb` pattern. Arqavellum's motion primitives import this
// so they don't have to know about web vs native.

import { useMemo } from 'react';
import { Animated } from 'react-native';
import { isWeb, isNative, isIOS, isAndroid } from '../utils';
import { DURATION } from '../constants';

export interface UsePlatformAnimationReturn {
  isWeb: boolean;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  useNativeDriver: boolean;
}

export function usePlatformAnimation(): UsePlatformAnimationReturn {
  const useNativeDriver = !isWeb;
  return useMemo(
    () => ({
      isWeb,
      isNative,
      isIOS,
      isAndroid,
      useNativeDriver,
    }),
    [useNativeDriver],
  );
}

export default usePlatformAnimation;
