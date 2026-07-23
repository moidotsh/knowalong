// utils/platform.ts
// Centralized platform abstraction to eliminate redundant Platform.OS checks.
// Arqavellum is PWA-first but keeps the native branches so consumers adding iOS
// or Android targets inherit correct gating for free.

import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export type AppPlatform = 'ios' | 'android' | 'web';

export const getAppPlatform = (): AppPlatform => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

export const hasDocument = (): boolean => typeof document !== 'undefined';
export const hasWindow = (): boolean => typeof window !== 'undefined';
export const hasLocalStorage = (): boolean =>
  isWeb && hasWindow() && !!window.localStorage;

export const renderWeb = <T>(web: T, native: T): T =>
  isWeb ? web : native;
