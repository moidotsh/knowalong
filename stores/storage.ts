// stores/storage.ts
// Zustand persistence storage adapter. Web uses localStorage; native
// (if a consumer chooses to ship native) uses AsyncStorage. Arqavellum
// is PWA-first so the web branch is the production path — the AsyncStorage
// branch exists so a future native-targeting consumer doesn't have to
// re-plumb this.

// Web uses localStorage below; AsyncStorage is the native branch only.
// The single legitimate direct import site (audit SE2 allowlist).
import AsyncStorage from '@react-native-async-storage/async-storage'; // asyncstorage-exempt: cross-platform storage adapter
import { isWeb } from '../utils/platform';

/**
 * Zustand-compatible storage. Persists state under the given key. The
 * shape matches the `StateStorage` interface from `zustand/middleware`:
 * getItem / setItem / removeItem all return strings (or null) synchronously
 * from the storage layer's perspective; zustand handles the Promise.
 */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return window.localStorage.getItem(name);
      } catch {
        // localStorage can throw in private browsing mode or when
        // sandboxed. Treat as "no stored value."
        return null;
      }
    }
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        window.localStorage.setItem(name, value);
      } catch {
        // Swallow — see getItem above. The store will operate without
        // persistence; state lives in memory for the session.
      }
      return;
    }
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (isWeb) {
      try {
        window.localStorage.removeItem(name);
      } catch {
        return;
      }
      return;
    }
    await AsyncStorage.removeItem(name);
  },
};

export default zustandStorage;
