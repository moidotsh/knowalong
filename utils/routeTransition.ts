// utils/routeTransition.ts
//
// The route curtain — the shell's optional navigation transition, the
// machinery behind `theme.transition.style = 'curtain'` (the ink
// dialect's preset; 'none' — the starter default — retires the whole
// system without touching it). Every intercepted navigation
// (NavigationHelper) plays the cover; every other path change (browser
// back, URL entry, auth redirects) gets the same reveal from the
// overlay's own path watch. The move is printed matter, not a fade: an
// ink plate sweeps over the page, the destination stamps on in the
// display face, and the plate lifts with a paper chaser trailing it.
//
// Phases (the overlay renders its panel whenever phase !== 'idle'):
//
//   idle      — no transition. `withRouteCurtain` may begin one.
//   covering  — an intercepted navigation is playing its cover-in;
//               the router call is pending (a fixed beat, never an
//               animation callback — navigation must not depend on a
//               frame ticking).
//   revealing — the panel holds (platen rule draws, eyebrow, stamp),
//               then exits. Self-timed by the panel; `finishReveal`
//               returns the store to idle.
//
// `session` bumps every cycle so the panel remounts with fresh
// Animated values per cover — no stale mid-flight offsets.
//
// Reduced motion + DOM tests collapse everything: `curtainEnabled()`
// is false, navigation is synchronous, and the overlay renders
// nothing. The app never blocks on choreography.

import { create } from 'zustand';
import { isWeb, hasWindow } from './platform';
import { theme, APP_DISPLAY_NAME } from '../constants';
import { getAiRouteMetadata, type AiRouteMeta } from '../navigation/routeMetadata';

// ─── Timing (shared by the store, the helper, and the panel) ───────────

/** Cover-in travel — the ink plate sweeping over the outgoing page. */
export const COVER_TRAVEL_MS = 150;
/** Beat before the router call fires under the cover (cover + slack). */
export const NAV_DELAY_MS = COVER_TRAVEL_MS + 20;
/**
 * Hold — the swap confirms inside this window; the stamp sequence
 * (rule, eyebrow, title) starts at the confirmed swap, never at mount,
 * so the outgoing page's title can never flash on the plate.
 */
export const HOLD_MS = 280;
/** Exit — the plate lifting away, paper chaser trailing. */
export const EXIT_MS = 420;
/**
 * If the router call never moves the path (guarded navs, same-route
 * pushes), the cover gives up and reveals anyway. The app never
 * strands under a curtain.
 */
export const REVEAL_SAFETY_MS = 520;
/** Hard ceiling on any reveal cycle — the panel normally finishes first. */
export const REVEAL_MAX_LIFE_MS = HOLD_MS + EXIT_MS + 600;

// ─── Curtain store ─────────────────────────────────────────────────────
// d10-exempt: a transient choreography phase machine, not domain state —
// no loading/error/modal/selection/UI sections apply to three fields and
// four phase transitions.

export type CurtainDirection = 'up' | 'down';
/**
 * `slide` — cover sweeps in over the outgoing page (intercepted navs).
 * `snap` — already covering at mount (path-watch reveals: back button,
 * URL entry — the render that swaps the route renders the plate already
 * covering, so the swap frame is never visible).
 */
export type CurtainMode = 'slide' | 'snap';
export type CurtainPhase = 'idle' | 'covering' | 'revealing';

interface RouteTransitionState {
  phase: CurtainPhase;
  mode: CurtainMode;
  direction: CurtainDirection;
  /** Bumped every cover/reveal cycle — remounts the panel with fresh values. */
  session: number;
  /** idle → covering. The intercepted-navigation entry. */
  beginCover: (direction: CurtainDirection) => void;
  /** covering → revealing. Called by the overlay when the path confirms arrival. */
  startReveal: () => void;
  /** idle → revealing (snap mode). Called by the overlay for path changes it didn't intercept. */
  beginSnapReveal: (direction: CurtainDirection) => void;
  /** Any → idle. The panel's exit callback; also the safety valve. */
  finishReveal: () => void;
  /** Test isolation — resets every field and clears timers. */
  resetForTests: () => void;
}

let revealSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let revealLifeTimer: ReturnType<typeof setTimeout> | null = null;

const clearRevealTimers = () => {
  if (revealSafetyTimer != null) {
    clearTimeout(revealSafetyTimer);
    revealSafetyTimer = null;
  }
  if (revealLifeTimer != null) {
    clearTimeout(revealLifeTimer);
    revealLifeTimer = null;
  }
};

export const useRouteTransitionStore = create<RouteTransitionState>((set, get) => {
  // A reveal cycle must always end, even if the panel's exit callback
  // is lost (backgrounded tab, hidden document) — arm the ceiling when
  // a reveal starts; the panel's own finish normally beats it.
  const armRevealCeiling = () => {
    if (revealLifeTimer != null) clearTimeout(revealLifeTimer);
    revealLifeTimer = setTimeout(() => {
      revealLifeTimer = null;
      if (get().phase === 'revealing') get().finishReveal();
    }, REVEAL_MAX_LIFE_MS);
  };

  return {
    phase: 'idle',
    mode: 'slide',
    direction: 'up',
    session: 0,

    beginCover: (direction) => {
      if (get().phase !== 'idle') return;
      clearRevealTimers();
      set((s) => ({ phase: 'covering', mode: 'slide', direction, session: s.session + 1 }));
      // The path may never change (guarded or same-route navigation) —
      // reveal anyway rather than hold the cover.
      revealSafetyTimer = setTimeout(() => {
        revealSafetyTimer = null;
        if (get().phase === 'covering') get().startReveal();
      }, REVEAL_SAFETY_MS);
    },

    startReveal: () => {
      if (get().phase !== 'covering') return;
      if (revealSafetyTimer != null) {
        clearTimeout(revealSafetyTimer);
        revealSafetyTimer = null;
      }
      set({ phase: 'revealing' });
      armRevealCeiling();
    },

    beginSnapReveal: (direction) => {
      if (get().phase !== 'idle') return;
      clearRevealTimers();
      set((s) => ({ phase: 'revealing', mode: 'snap', direction, session: s.session + 1 }));
      armRevealCeiling();
    },

    finishReveal: () => {
      clearRevealTimers();
      if (get().phase === 'idle') return;
      set({ phase: 'idle' });
    },

    resetForTests: () => {
      clearRevealTimers();
      set({ phase: 'idle', mode: 'slide', direction: 'up', session: 0 });
    },
  };
});

// ─── Orchestration entry (NavigationHelper) ────────────────────────────

const prefersReducedMotion = (): boolean => {
  if (!isWeb || !hasWindow()) return false;
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Whether the curtain plays at all. The theme's transition axis
 * declares it (the ink dialect presets 'curtain'; 'none' — the starter
 * default — keeps the machinery retired). Web only (PWA-first), never
 * in DOM tests (jsdom has no frames to spare), never under reduced
 * motion.
 */
export function curtainEnabled(): boolean {
  return (
    isWeb &&
    process.env.NODE_ENV !== 'test' &&
    !prefersReducedMotion() &&
    theme.transition?.style === 'curtain'
  );
}

/**
 * Cover, then navigate. The router call fires a fixed beat after the
 * cover begins — the outgoing page is already under ink when the swap
 * commits, so the new route's first painted frame is fully covered.
 * Inert (synchronous) whenever `curtainEnabled()` is false, so wiring
 * this through NavigationHelper changes nothing for glass consumers.
 */
export function withRouteCurtain(go: () => void, direction: CurtainDirection = 'up'): void {
  if (!curtainEnabled()) {
    go();
    return;
  }
  const s = useRouteTransitionStore.getState();
  if (s.phase !== 'idle') {
    // A curtain is already in flight — navigate immediately, never queue.
    go();
    return;
  }
  s.beginCover(direction);
  setTimeout(go, NAV_DELAY_MS);
}

// ─── Copy — what the curtain says about its destination ────────────────

export interface RouteCurtainCopy {
  /** The small line above the stamp — a context label, else the wordmark. */
  eyebrow: string;
  /** The stamp — the destination's own title, never invented copy. */
  stamp: string;
}

const WORDMARK = APP_DISPLAY_NAME.toUpperCase();

/**
 * Shell-route titles the curtain echoes when the consumer's route
 * registry has no entry — the same strings the screens' own headers
 * carry, so the plate always says what the destination screen says.
 */
const SHELL_TITLES: Record<string, string> = {
  login: 'Welcome back',
  register: 'Create account',
  'forgot-password': 'Reset password',
  settings: 'Settings',
  dev: 'Design system',
};

/**
 * The curtain's copy for a destination path. Pure over (path, registry):
 * the stamp echoes the route registry's title (the same
 * `navigation/routeMetadata.ts` map Copy-for-AI reads — one registry,
 * two consumers), falling back to the shell routes' own header titles,
 * falling back to the wordmark. The eyebrow reads the registry's
 * `contextLabel` when present, else the wordmark. No new copy is
 * invented here — the curtain always says what the destination says.
 */
export function routeCurtainCopy(
  pathname: string,
  getMeta: (pathname: string) => AiRouteMeta = getAiRouteMetadata,
): RouteCurtainCopy {
  const segments = pathname.split('/').filter(Boolean);
  const [head] = segments;

  if (head == null) {
    // Home — the brand moment.
    return { eyebrow: WORDMARK, stamp: WORDMARK };
  }

  const meta = getMeta(pathname);
  if (meta.title != null) {
    return {
      eyebrow: (meta.contextLabel ?? WORDMARK).toUpperCase(),
      stamp: meta.title,
    };
  }

  const shellTitle = SHELL_TITLES[head];
  if (shellTitle != null) {
    return { eyebrow: WORDMARK, stamp: shellTitle };
  }

  return { eyebrow: WORDMARK, stamp: WORDMARK };
}

// ─── Boot plate handshake ──────────────────────────────────────────────

/**
 * Lift the pre-JS boot plate, if one was pasted into index.html (the
 * opt-in ink boot: an id'd `<style>`/`<script>` pair painting the
 * curtain's ink plate before any JS arrives, lifted by this handshake
 * — see the design-system docs' boot recipe). Sets `data-boot-ready`
 * on `<html>`; a no-op off-web and when no boot CSS exists.
 */
export function markBootReady(): void {
  if (!isWeb || !hasWindow()) return;
  document.documentElement.dataset.bootReady = '1';
}
