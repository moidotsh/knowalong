// context/ToastContext.tsx
// Toast notification context for non-blocking alerts. Toasts auto-dismiss
// after `duration` ms (default 4000); pass `duration: 0` for sticky toasts.
//
// The context registers itself as the global toast callback on mount so
// `utils/crossPlatformAlert.ts` can emit toasts from outside React (e.g.
// from a service or a Zustand action) via `utils/toastEventEmitter.ts`.

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { setGlobalToastCallback, type ToastType } from '../utils/toastEventEmitter';

export type { ToastType } from '../utils/toastEventEmitter';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Register this context's showToast as the global toast callback so
  // utils/crossPlatformAlert.ts (and any non-React code) can emit toasts.
  useEffect(() => {
    setGlobalToastCallback(showToast);
    return () => setGlobalToastCallback(null);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    // s10-exempt: this is a React invariant throw — AppError's domain
    // machinery doesn't add anything for "you forgot the provider".
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
