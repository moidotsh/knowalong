// stores/authStore.ts
// Cross-cutting auth state. Slim by design — domain auth concerns
// (e.g. PIN re-auth, encryption-key status) live in consumer-added
// stores. Arqavellum's authStore only carries the user identity + status
// that every consumer needs.

// =============================================================================
// SECTION: Loading
// status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
// Tracks the current auth-flow state so the AuthGuard can decide
// whether to redirect, render a spinner, or render the route.
// =============================================================================

// =============================================================================
// SECTION: Error
// error: string | null
// Last auth-flow error surfaced to the UI. Cleared on the next attempt.
// =============================================================================

// =============================================================================
// SECTION: Modals
// (No modal state in this store — see uiStore for modals.)
// =============================================================================

// =============================================================================
// SECTION: Selection
// (No selection state in this store.)
// =============================================================================

// =============================================================================
// SECTION: UI
// (No UI flags in this store.)
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  // SECTION: Loading
  status: AuthStatus;

  // SECTION: Error
  error: string | null;

  // SECTION: Modals
  // (intentionally empty)

  // SECTION: Selection
  // (intentionally empty)

  // SECTION: UI
  userId: string | null;
  email: string | null;

  // Actions
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  setSession: (session: { userId: string; email: string } | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as AuthStatus,
  error: null as string | null,
  userId: null as string | null,
  email: null as string | null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      setSession: (session) =>
        set(
          session
            ? {
                userId: session.userId,
                email: session.email,
                status: 'authenticated' as AuthStatus,
                error: null,
              }
            : {
                userId: null,
                email: null,
                status: 'unauthenticated' as AuthStatus,
              },
        ),
      reset: () => set(initialState),
    }),
    {
      name: 'knowalong-auth',
      storage: createJSONStorage(() => zustandStorage),
      // Auth state is fully re-derived on every boot — AuthProvider's
      // mount-time setStatus('loading') + restoreSession() decide the
      // initial status. Persisting any of these lets a stale
      // 'authenticated' or stale userId survive a reload, which fires
      // queries against a dead session (the `enabled: !!userId` gates
      // light up before restore resolves). The persist middleware
      // stays (forward-compat for future fields that genuinely need to
      // survive reloads) but partialize returns nothing today.
      partialize: () => ({}),
    },
  ),
);

export default useAuthStore;
