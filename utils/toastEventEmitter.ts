// utils/toastEventEmitter.ts
// Global event emitter for toast notifications. Decouples toast emitters
// (services, Zustand actions, navigation helpers) from the React tree.
//
// `ToastType` lives here (not in context/) so utils/ owns the producer-side
// type contract. ToastContext.tsx imports it downward, avoiding a cycle.
//
// `setGlobalToastCallback` is called by ToastProvider on mount. Before
// that, any `emitToast` call falls back to `logger.warn` so silent-toast
// regressions are visible in dev.

import { logger } from './logger';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastCallback = (type: ToastType, message: string, duration?: number) => void;

let globalToastCallback: ToastCallback | null = null;

export const setGlobalToastCallback = (callback: ToastCallback | null) => {
  globalToastCallback = callback;
};

export const emitToast = (type: ToastType, message: string, duration?: number) => {
  if (globalToastCallback) {
    globalToastCallback(type, message, duration);
  } else {
    logger.warn('ui', `Toast fallback (no callback registered): ${type}: ${message}`);
  }
};
