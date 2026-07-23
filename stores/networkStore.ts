// stores/networkStore.ts
// Online/offline detection. Drives the offline queue (mutations queue
// locally while offline, flush on reconnect). Arqavellum is PWA-first so
// this is web-only — window online/offline events. A consumer adding
// native targets would extend `initializeListeners` with NetInfo.

// =============================================================================
// SECTION: Loading
// (No loading state — connectivity is detected synchronously.)
// =============================================================================

// =============================================================================
// SECTION: Error
// (No error state — connectivity is a boolean.)
// =============================================================================

// =============================================================================
// SECTION: Modals
// (No modal state in this store.)
// =============================================================================

// =============================================================================
// SECTION: Selection
// (No selection state in this store.)
// =============================================================================

// =============================================================================
// SECTION: UI
// isOnline: current connectivity
// lastOnlineTime / lastOfflineTime: timestamps for logging / debugging
// =============================================================================

import { create } from 'zustand';
import { isWeb } from '../utils/platform';
import { logger } from '../utils';

interface NetworkState {
  // SECTION: Loading
  // (intentionally empty)

  // SECTION: Error
  // (intentionally empty)

  // SECTION: Modals
  // (intentionally empty)

  // SECTION: Selection
  // (intentionally empty)

  // SECTION: UI
  isOnline: boolean;
  lastOnlineTime: number | null;
  lastOfflineTime: number | null;

  setOnline: () => void;
  setOffline: () => void;
  initializeListeners: () => () => void;
}

function getInitialOnlineStatus(): boolean {
  if (isWeb) {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  return true;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  // SECTION: UI
  isOnline: getInitialOnlineStatus(),
  lastOnlineTime: getInitialOnlineStatus() ? Date.now() : null,
  lastOfflineTime: null,

  setOnline: () => set({ isOnline: true, lastOnlineTime: Date.now() }),
  setOffline: () => set({ isOnline: false, lastOfflineTime: Date.now() }),

  initializeListeners: () => {
    if (!isWeb) {
      // Native target — consumer extends this. For now, no-op.
      logger.warn('general', 'networkStore.initializeListeners called on native — PWA-first arqavellum does not wire NetInfo. Consumer adds this.');
      return () => {};
    }
    const handleOnline = () => get().setOnline();
    const handleOffline = () => get().setOffline();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
}));

export const useIsOnline = () => useNetworkStore((state) => state.isOnline);

export function getNetworkStatus(): boolean {
  return useNetworkStore.getState().isOnline;
}

export function initializeNetworkListeners(): () => void {
  return useNetworkStore.getState().initializeListeners();
}

export default useNetworkStore;
