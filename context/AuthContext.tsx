// context/AuthContext.tsx
// Auth context — wires AuthService to the React tree. The `useAuth()`
// hook is the consumer-side surface; the provider reads the session
// once on mount and subscribes to Supabase auth state changes so
// sign-in / sign-out / token refresh propagate.
//
// Each session write also mirrors into authStore (via non-reactive
// `useAuthStore.getState()` calls) so the central AuthGuard + the
// `safeGoBack()` helper can read live auth status without subscribing
// to this context. The local `session`/`initializing` React state
// remains the source of truth for `useAuth()` consumers; the store
// is a parallel write target.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthService, type AuthSession } from '../utils/supabase';
import { logger } from '../utils';
import { useAuthStore } from '../stores';

interface AuthContextValue {
  session: AuthSession | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  // `initializing` defaults to false so children render on first paint
  // instead of waiting on restoreSession() (the prior `true` default
  // blocked first paint for ~800ms on cold boots). The authStore.status
  // (driven by the mount-time setStatus call below) is what AuthGuard
  // reads to gate redirects — `useAuth().session` stays null until
  // restore resolves, which is what the `enabled: !!userId` gates on
  // queries already guard against.
  const [initializing, setInitializing] = useState(false);

  // Restore session on mount + subscribe to auth state changes. The
  // `cancelled` flag guards every setState after the await window so
  // an unmount during restoreSession doesn't try to write into a
  // gone provider (audit R1). Each session write mirrors into
  // authStore so the AuthGuard + safeGoBack() can read live status.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    // Mark loading while restore is in flight so AuthGuard waits
    // before deciding to redirect. authStore no longer persists
    // status (see stores/authStore.ts partialize), so this call is
    // what guarantees `status === 'loading'` on every boot — without
    // it, status would stay at 'idle' (initial state) and AuthGuard
    // would still skip redirects (idle is gated too), but the
    // explicit flip keeps the semantics clear and survives any
    // future change to AuthGuard's idle handling.
    useAuthStore.getState().setStatus('loading');

    (async () => {
      try {
        const restored = await AuthService.restoreSession();
        if (cancelled) return;
        setSession(restored);
        useAuthStore.getState().setSession(
          restored ? { userId: restored.userId, email: restored.email } : null,
        );
        unsubscribe = AuthService.onAuthStateChange((next) => {
          if (cancelled) return;
          setSession(next);
          useAuthStore.getState().setSession(
            next ? { userId: next.userId, email: next.email } : null,
          );
        });
      } catch (e) {
        if (!cancelled) logger.warn('auth', 'AuthProvider restore failed', e);
        if (!cancelled) useAuthStore.getState().setSession(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      signIn: async (email, password) => {
        const r = await AuthService.signIn(email, password);
        if (r.success && r.session) {
          setSession(r.session);
          useAuthStore.getState().setSession({
            userId: r.session.userId,
            email: r.session.email,
          });
        }
        return { success: r.success, error: r.error };
      },
      signUp: async (email, password) => {
        const r = await AuthService.signUp(email, password);
        if (r.success && r.session) {
          setSession(r.session);
          useAuthStore.getState().setSession({
            userId: r.session.userId,
            email: r.session.email,
          });
        }
        return { success: r.success, error: r.error };
      },
      signOut: async () => {
        await AuthService.signOut();
        setSession(null);
        useAuthStore.getState().setSession(null);
      },
      resetPassword: async (email) => {
        const r = await AuthService.resetPassword(email);
        return { success: r.success, error: r.error };
      },
    }),
    [session, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // s10-exempt: programmer-error invariant — calling useAuth outside
    // <AuthProvider> is a wiring bug, not a runtime error to surface.
    // AppError's domain-categorization machinery doesn't add anything.
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export default AuthProvider;
