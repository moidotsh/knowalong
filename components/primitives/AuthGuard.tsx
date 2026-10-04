// components/primitives/AuthGuard.tsx
// Central auth-flow redirect wrapper. Reads the live auth status from
// authStore + the current top-most route segment from expo-router, and
// redirects when the two disagree:
//
//   • unauthenticated + protected route  → /login
//   • authenticated  + auth route        → /
//
// Sits inside <AuthProvider> in _layout.tsx and wraps the <Stack/>.
// Idempotent: re-runs only when status or the root segment changes.
//
// While status is 'idle' (initial store state on every boot — authStore
// no longer persists status, see stores/authStore.ts) or 'loading'
// (restore in flight), the guard renders children unchanged so the
// restore window doesn't flash a redirect. The AuthProvider's
// mount-time setStatus('loading') call is what guarantees 'loading' is
// observed; without it, status would stay at 'idle' through the first
// render. AuthGuard treats both identically, so the explicit flip is
// belt-and-suspenders.
//
// PUBLIC_SEGMENTS: routes accessible without authentication. The dev
// showcase (`/dev/premium`) is a design-system reference, not product
// surface — gating it would block consumers from evaluating the kit
// before wiring auth. Add a segment here only when the route carries
// no user data and serves a tooling/docs purpose.
//
// THE NOT-FOUND EXEMPTION: an unknown URL renders the +not-found screen
// (shell copy, nothing to protect), and it must render — a mistyped URL
// gets the honest dead end, never a login wall. The not-found screen
// marks itself active from its mount effect; the guard reads the flag
// before redirecting. Ordering is the documented child-before-parent
// effect rule (the same guarantee the /qr screen's report-before-root-
// layout relies on): the child's mount/cleanup both run before this
// guard's effect on their commits.

import React, { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { useAuthStore } from '../../stores';
import { replaceWithHome, replaceWithLogin } from '../../navigation';

const AUTH_SEGMENTS = new Set(['login', 'register', 'forgot-password']);
// 'qr' is the printed-code redirect stub (invariant 13) — no data,
// hands straight to home; an unsigned scanner must never see /login.
const PUBLIC_SEGMENTS = new Set(['dev', 'qr']);

// Set by the +not-found screen's mount effect; see the header note.
let notFoundActive = false;

/** Called by app/+not-found.tsx on mount. */
export function markNotFoundActive(): void {
  notFoundActive = true;
}

/** Called by app/+not-found.tsx's cleanup — the screen unmounted. */
export function markNotFoundInactive(): void {
  notFoundActive = false;
}

export function AuthGuard({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  /**
   * False = open mode: unauthenticated visitors render every route
   * (the starter default — see APP_LAYOUT.authGuard in
   * constants/layout.ts). The signed-in-away-from-auth-screens
   * redirect runs in both modes.
   */
  enabled?: boolean;
}) {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const root = segments[0];

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;
    const inAuthGroup =
      typeof root === 'string' && AUTH_SEGMENTS.has(root);
    const isPublic =
      typeof root === 'string' && PUBLIC_SEGMENTS.has(root);
    if (
      enabled &&
      status === 'unauthenticated' &&
      !inAuthGroup &&
      !isPublic &&
      !notFoundActive
    ) {
      replaceWithLogin();
    } else if (status === 'authenticated' && inAuthGroup) {
      replaceWithHome();
    }
  }, [status, root, enabled]);

  return <>{children}</>;
}

export default AuthGuard;
