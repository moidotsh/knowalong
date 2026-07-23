// navigation/NavigationHelper.tsx
//
// The single legitimate site for raw `router.push` / `router.replace` /
// `router.back` calls (audit C1 allows them here and in
// `hooks/useAuthNavigation.ts`). Every other file in the app navigates
// through the helpers exported from this file — that way the call sites
// read as intent (`replaceWithLogin()`) rather than mechanism
// (`router.replace('/login')`), and a global navigation change (e.g.
// swizzling every push with a transition) lands in one place.
//
// Naming convention:
//   - `navigateToX()` — `router.push` (drills in; adds to back-stack).
//   - `replaceWithX()` — `router.replace` (redirects; back-stack stays
//     where it was). Use for auth-flow redirects and "you can't go back
//     to where you were" transitions (post-login, post-logout, post-register).
//
// Arqavellum ships helpers for the shell routes only. Consumers add their
// own helpers for domain routes (items, records, details, dashboards, …)
// by extending this file or by adding a sibling (e.g. `DomainNavigation.tsx`
// re-exported from `navigation/index.tsx`).

import { router, Router } from 'expo-router';
import { useAuthStore } from '../stores';

/**
 * Shell navigation paths. Consumers add their own routes to a sibling
 * enum (or extend this one) — the `navigationHierarchy` map below is
 * the source of truth for "what's the parent of X?" used by `goBack`.
 */
export enum NavigationPath {
  HOME = 'home',
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  SETTINGS = 'settings',
  DEV_PREMIUM = 'dev/premium',
  // KnowAlong domain routes
  IMPORT = 'import',
  SOURCE_DETAIL = 'source',
  SECTION_DETAIL = 'section',
  VOCABULARY_DETAIL = 'vocabulary',
  REVIEW = 'review',
  DEV_KNOWALONG = 'dev/knowalong',
  // KnowAlong local analysis & CLCC routes
  SOURCE_ANALYSIS = 'source-analysis',
  ANALYSIS_RUN = 'analysis-run',
  CLCC = 'clcc',
  CLCC_RUN = 'clcc-run',
  SETTINGS_COMPANION = 'settings-companion',
}

/**
 * Parent-of map used by `goBack(currentPath)`. Each value is the route
 * the user should land on if they hit "back" from the key route.
 *
 * Shell routes parent to HOME (the post-auth entry point) except for
 * FORGOT_PASSWORD, which parents to LOGIN (reached from the login screen
 * and meant to return there).
 */
export const navigationHierarchy: Record<string, NavigationPath> = {
  [NavigationPath.LOGIN]: NavigationPath.HOME,
  [NavigationPath.REGISTER]: NavigationPath.HOME,
  [NavigationPath.FORGOT_PASSWORD]: NavigationPath.LOGIN,
  [NavigationPath.SETTINGS]: NavigationPath.HOME,
  [NavigationPath.DEV_PREMIUM]: NavigationPath.HOME,
  // KnowAlong domain routes
  [NavigationPath.IMPORT]: NavigationPath.HOME,
  [NavigationPath.SOURCE_DETAIL]: NavigationPath.HOME,
  [NavigationPath.SECTION_DETAIL]: NavigationPath.SOURCE_DETAIL,
  [NavigationPath.VOCABULARY_DETAIL]: NavigationPath.SOURCE_DETAIL,
  [NavigationPath.REVIEW]: NavigationPath.HOME,
  [NavigationPath.DEV_KNOWALONG]: NavigationPath.HOME,
  // Local analysis & CLCC
  [NavigationPath.SOURCE_ANALYSIS]: NavigationPath.SOURCE_DETAIL,
  [NavigationPath.ANALYSIS_RUN]: NavigationPath.SOURCE_ANALYSIS,
  [NavigationPath.CLCC]: NavigationPath.HOME,
  [NavigationPath.CLCC_RUN]: NavigationPath.CLCC,
  [NavigationPath.SETTINGS_COMPANION]: NavigationPath.SETTINGS,
};

// ─── Push helpers (drill in) ────────────────────────────────────────────

export function navigateToHome() {
  router.push('/');
}

export function navigateToLogin() {
  router.push('/login');
}

export function navigateToRegister() {
  router.push('/register');
}

export function navigateToForgotPassword() {
  router.push('/forgot-password');
}

export function navigateToSettings() {
  router.push('/settings');
}

/**
 * Navigate to the design-system showcase. Useful while developing — not
 * linked from any user-facing surface by default.
 */
export function navigateToPremiumShowcase() {
  router.push('/dev/premium');
}

// ─── KnowAlong domain push helpers ─────────────────────────────────────

export function navigateToImport() {
  router.push('/import');
}

export function navigateToSource(sourceId: string) {
  router.push(`/source/${sourceId}`);
}

export function navigateToSection(sourceId: string, sectionId: string) {
  router.push(`/source/${sourceId}/section/${sectionId}`);
}

export function navigateToLemma(lemmaId: string) {
  router.push(`/vocabulary/${lemmaId}`);
}

export function navigateToReview() {
  router.push('/review');
}

export function navigateToKnowAlongDemo() {
  router.push('/dev/knowalong');
}

// ─── Local analysis & CLCC push helpers ─────────────────────────────────

export function navigateToSourceAnalysis(sourceId: string) {
  router.push(`/source/${sourceId}/analysis`);
}

export function navigateToAnalysisRun(sourceId: string, runId: string) {
  router.push(`/source/${sourceId}/analysis/${runId}`);
}

export function navigateToClcc() {
  router.push('/clcc');
}

export function navigateToClccRun(runId: string) {
  router.push(`/clcc/${runId}`);
}

export function navigateToCompanionSettings() {
  router.push('/settings/companion');
}

// ─── Replace helpers (redirects) ────────────────────────────────────────

export function replaceWithHome() {
  router.replace('/');
}

export function replaceWithLogin() {
  router.replace('/login');
}

export function replaceWithRegister() {
  router.replace('/register');
}

/**
 * Replace with the forgot-password screen. Reached from the login
 * screen's "forgot password?" link. `push` is usually right there
 * (login should stay in the back-stack) — this variant is for the rare
 * redirect-from-deep-link case.
 */
export function replaceWithForgotPassword() {
  router.replace('/forgot-password');
}

// ─── Back navigation ────────────────────────────────────────────────────

/**
 * Safe back navigation — prefers `router.back()` when there's history to
 * go back to, otherwise falls back to home (if authenticated) or login.
 *
 * Use this instead of `router.back()` anywhere a user can hit "back"
 * without a guaranteed parent route (deep links, refreshed PWA tabs).
 *
 * Reads auth state via `useAuthStore.getState()` (non-reactive) so the
 * decision reflects the current auth state at call time without
 * subscribing the helper to the store.
 */
export function safeGoBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  const { status } = useAuthStore.getState();
  if (status === 'authenticated') {
    router.replace('/');
  } else {
    router.replace('/login');
  }
}

/**
 * Hierarchy-respecting back navigation. Given the current path, jumps
 * to its declared parent (see `navigationHierarchy`) instead of
 * trusting the browser's history stack.
 *
 * Prefer `safeGoBack()` for the common case — this variant is for
 * flows where the parent route is meaningfully different from "the page
 * you came from" (e.g. settings deep-linked from a notification should
 * back to home, not to the notification).
 */
export function goBack(currentPath: NavigationPath | string) {
  if (Object.values(NavigationPath).includes(currentPath as NavigationPath)) {
    const parentPath = navigationHierarchy[currentPath] || NavigationPath.HOME;
    if (parentPath === NavigationPath.HOME) {
      router.push('/');
      return;
    }
    router.push(`/${parentPath}`);
    return;
  }

  router.push('/');
}

// Re-export the underlying router instance + type for consumers that
// need to pass it along (e.g. a navigation context provider).
export { router as routerInstance };
export type { Router };
