// navigation/NavigationHelper.tsx
//
// The single legitimate site for raw `router.push` / `router.replace` /
// `router.back` calls (audit C1 allows them here and in
// `hooks/useAuthNavigation.ts`). Every other file in the app navigates
// through the helpers exported from this file — that way the call sites
// read as intent (`replaceWithLogin()`) rather than mechanism
// (`replace('/login')`), and a global navigation change (e.g.
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
import { withRouteCurtain } from '../utils';

/**
 * Every shell navigation routes through `withRouteCurtain` — the
 * route-curtain seam declared by `theme.transition.style`. Inert under
 * the starter's 'none' default (the call passes straight through, zero
 * behavior change); under 'curtain' (the ink dialect's preset) the plate
 * covers before the router fires and lifts over the arrival. Back
 * navigation reveals 'down'; everything else drills 'up'.
 */
const push = (path: string) => withRouteCurtain(() => router.push(path), 'up');
const replace = (path: string) => withRouteCurtain(() => router.replace(path), 'up');
const back = () => withRouteCurtain(() => router.back(), 'down');

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
  DECK_DETAIL = 'deck',
  SUBDECK_DETAIL = 'subdeck',
  VOCABULARY_DETAIL = 'vocabulary',
  REVIEW = 'review',
  DEV_KNOWALONG = 'dev/knowalong',
  // KnowAlong local analysis & CLCC routes
  SOURCE_ANALYSIS = 'source-analysis',
  ANALYSIS_RUN = 'analysis-run',
  CLCC = 'clcc',
  CLCC_RUN = 'clcc-run',
  SETTINGS_COMPANION = 'settings-companion',
  // Song-first surfaces (§1.1)
  SONG_DETAIL = 'song',
  SONG_SECTION = 'song-section',
  // Learner-journey experience (consumer prototype)
  JOURNEY = 'journey',
  WELCOME = 'welcome',
  COLLECTION = 'collection',
  COLLECTION_ITEM = 'collection-item',
  READER = 'reader',
  COLLECTION_ADD = 'collection-add',
  NOTEBOOK = 'notebook',
  NOTEBOOK_ENTRY = 'notebook-entry',
  SESSION = 'session',
  DEV_JOURNEY = 'dev/journey',
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
  [NavigationPath.DECK_DETAIL]: NavigationPath.HOME,
  [NavigationPath.SUBDECK_DETAIL]: NavigationPath.DECK_DETAIL,
  [NavigationPath.VOCABULARY_DETAIL]: NavigationPath.SOURCE_DETAIL,
  [NavigationPath.REVIEW]: NavigationPath.HOME,
  [NavigationPath.DEV_KNOWALONG]: NavigationPath.HOME,
  // Local analysis & CLCC
  [NavigationPath.SOURCE_ANALYSIS]: NavigationPath.SOURCE_DETAIL,
  [NavigationPath.ANALYSIS_RUN]: NavigationPath.SOURCE_ANALYSIS,
  [NavigationPath.CLCC]: NavigationPath.HOME,
  [NavigationPath.CLCC_RUN]: NavigationPath.CLCC,
  [NavigationPath.SETTINGS_COMPANION]: NavigationPath.SETTINGS,
  // Song-first surfaces (§1.1)
  [NavigationPath.SONG_DETAIL]: NavigationPath.HOME,
  [NavigationPath.SONG_SECTION]: NavigationPath.SONG_DETAIL,
  // Learner-journey experience
  [NavigationPath.JOURNEY]: NavigationPath.HOME,
  [NavigationPath.WELCOME]: NavigationPath.JOURNEY,
  [NavigationPath.COLLECTION]: NavigationPath.JOURNEY,
  [NavigationPath.COLLECTION_ITEM]: NavigationPath.COLLECTION,
  [NavigationPath.READER]: NavigationPath.COLLECTION_ITEM,
  [NavigationPath.COLLECTION_ADD]: NavigationPath.COLLECTION,
  [NavigationPath.NOTEBOOK]: NavigationPath.JOURNEY,
  [NavigationPath.NOTEBOOK_ENTRY]: NavigationPath.NOTEBOOK,
  [NavigationPath.SESSION]: NavigationPath.JOURNEY,
  [NavigationPath.DEV_JOURNEY]: NavigationPath.HOME,
};

// ─── Push helpers (drill in) ────────────────────────────────────────────

export function navigateToHome() {
  push('/');
}

export function navigateToLogin() {
  push('/login');
}

export function navigateToRegister() {
  push('/register');
}

export function navigateToForgotPassword() {
  push('/forgot-password');
}

export function navigateToSettings() {
  push('/settings');
}

/**
 * Navigate to the design-system showcase. Useful while developing — not
 * linked from any user-facing surface by default.
 */
export function navigateToPremiumShowcase() {
  push('/dev/premium');
}

// ─── KnowAlong domain push helpers ─────────────────────────────────────

export function navigateToImport() {
  push('/import');
}

export function navigateToStudy() {
  push('/study');
}

export function navigateToLessons() {
  push('/lessons');
}

export function navigateToLesson(lessonId: string) {
  push(`/lessons/${lessonId}`);
}

// Drill into a deck overview (song = deck). For song decks this lists the
// sub-decks (sections); for flat decks it lists lessons directly.
export function navigateToDeck(deckId: string) {
  push(`/deck/${deckId}`);
}

// Drill into a section (sub-deck) within a song deck — the locked lesson list.
export function navigateToSubDeck(deckId: string, subDeckId: string) {
  push(`/deck/${deckId}/section/${subDeckId}`);
}

export function navigateToProgress() {
  push('/progress');
}

export function navigateToAchievements() {
  push('/achievements');
}

export function navigateToVocabulary() {
  push('/vocabulary');
}

export function navigateToDaily() {
  push('/daily');
}

export function navigateToOnboarding() {
  push('/onboarding');
}

export function navigateToConversation() {
  push('/conversation');
}

export function navigateToProfile() {
  push('/profile');
}

export function navigateToGrammar() {
  push('/grammar');
}

export function navigateToConcept(code: string) {
  push(`/concept/${code}`);
}

export function navigateToStudySettings() {
  push('/settings/study');
}

export function navigateToListen() {
  push('/listen');
}

export function navigateToMatch() {
  push('/match');
}

export function navigateToReading() {
  push('/reading');
}

export function navigateToMistakes() {
  push('/mistakes');
}

export function navigateToSongs() {
  push('/songs');
}

export function navigateToConnections() {
  push('/connections');
}

export function navigateToType() {
  push('/type');
}

export function navigateToAlphabet() {
  push('/alphabet');
}

export function navigateToNumbers() {
  push('/numbers');
}

export function navigateToSvetofor() {
  push('/source/svetofor/svetofor');
}

export function navigateToSource(sourceId: string) {
  push(`/source/${sourceId}`);
}

// ─── Song-first surfaces (§1.1) ─────────────────────────────────────────

/** Drill into a song's detail surface — the shelf's primary drill-in. */
export function navigateToSong(songId: string) {
  push(`/song/${songId}`);
}

/** Open a song's passage reader for one canonical section. */
export function navigateToSongSection(songId: string, sectionId: string) {
  push(`/song/${songId}/section/${sectionId}`);
}

export function navigateToSection(sourceId: string, sectionId: string) {
  push(`/source/${sourceId}/section/${sectionId}`);
}

export function navigateToLemma(lemmaId: string) {
  push(`/vocabulary/${lemmaId}`);
}

export function navigateToReview() {
  push('/review');
}

export function navigateToKnowAlongDemo() {
  push('/dev/knowalong');
}

// ─── Local analysis & CLCC push helpers ─────────────────────────────────

export function navigateToSourceAnalysis(sourceId: string) {
  push(`/source/${sourceId}/analysis`);
}

export function navigateToAnalysisRun(sourceId: string, runId: string) {
  push(`/source/${sourceId}/analysis/${runId}`);
}

export function navigateToClcc() {
  push('/clcc');
}

export function navigateToClccRun(runId: string) {
  push(`/clcc/${runId}`);
}

export function navigateToCompanionSettings() {
  push('/settings/companion');
}

// ─── Learner-journey experience (push) ──────────────────────────────────

export function navigateToJourney() {
  push('/journey');
}

export function navigateToWelcome() {
  push('/welcome');
}

export function navigateToCollection() {
  push('/collection');
}

export function navigateToCollectionItem(itemId: string) {
  push(`/collection/${itemId}`);
}

/** Open a collection item's Explore reader. */
export function navigateToReader(itemId: string) {
  push(`/collection/${itemId}/read`);
}

export function navigateToCollectionAdd() {
  push('/collection/add');
}

export function navigateToNotebook() {
  push('/notebook');
}

export function navigateToNotebookEntry(entryId: string) {
  push(`/notebook/${encodeURIComponent(entryId)}`);
}

/** Open the one session player for a session plan id. */
export function navigateToSession(sessionId: string) {
  push(`/session/${encodeURIComponent(sessionId)}`);
}

export function navigateToDevJourney() {
  push('/dev/journey');
}

// ─── Learner-journey experience (tab switches) ──────────────────────────
//
// The three primary destinations switch with `replace`, like the
// song-first tabs above — Journey ↔ Collection ↔ Notebook must not
// grow a back-stack entry per visit. The back gesture belongs to
// drilling into a chapter, an item, or a session.

export function switchToJourney() {
  replace('/journey');
}

export function switchToCollection() {
  replace('/collection');
}

export function switchToNotebook() {
  replace('/notebook');
}

// ─── Replace helpers (redirects) ────────────────────────────────────────

export function replaceWithHome() {
  replace('/');
}

export function replaceWithLogin() {
  replace('/login');
}

export function replaceWithRegister() {
  replace('/register');
}

/**
 * Replace with the forgot-password screen. Reached from the login
 * screen's "forgot password?" link. `push` is usually right there
 * (login should stay in the back-stack) — this variant is for the rare
 * redirect-from-deep-link case.
 */
export function replaceWithForgotPassword() {
  replace('/forgot-password');
}

/** Entry redirect: onboarding done → the Journey; otherwise → Welcome. */
export function replaceWithJourneyEntry(onboardingComplete: boolean) {
  if (onboardingComplete) {
    replace('/journey');
  } else {
    replace('/welcome');
  }
}

// ─── Tab switches (song-first shell, §1.1) ──────────────────────────────
//
// Bottom-tab movement REPLACES instead of pushes — today → words → today
// must not build a back-stack entry per surface visited. The back gesture
// belongs to drilling into a song and its passages, not replaying tab
// history. (expo-router's Tabs aren't used; these pair with SongTabBar.)

export function switchToToday() {
  replace('/');
}

export function switchToSongs() {
  replace('/songs');
}

export function switchToWords() {
  replace('/words');
}

export function switchToProfile() {
  replace('/profile');
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
    back();
    return;
  }

  const { status } = useAuthStore.getState();
  if (status === 'authenticated') {
    replace('/');
  } else {
    replace('/login');
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
      push('/');
      return;
    }
    push(`/${parentPath}`);
    return;
  }

  push('/');
}

// Re-export the underlying router instance + type for consumers that
// need to pass it along (e.g. a navigation context provider).
export { router as routerInstance };
export type { Router };
