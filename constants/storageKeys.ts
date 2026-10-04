// constants/storageKeys.ts
// Every literal that carries the starter's name at RUNTIME: persisted
// storage keys, injected DOM ids, and the dev-bypass identity. Consumers
// rebrand in ONE place (this file) — otherwise stale `arqavellum-*` keys
// linger in DevTools storage, DOM ids collide across clones, and two apps
// on the same localhost origin share localStorage.

export const STORAGE_KEYS = {
  /** Theme preference (ThemeContext persistence). */
  colorScheme: 'knowalong:color-scheme',
  /** PWA install-prompt dismissal cooldown (usePwaPrompt). */
  pwaPromptDismissed: 'knowalong:pwa-prompt-dismissed',
  /** authStore (zustand persist name). */
  authStore: 'knowalong-auth',
  /** i18n lang store (zustand persist name). */
  langStore: 'knowalong-lang',
  /** Once-per-session visit-source report flag (webAnalytics, sessionStorage). */
  visitSource: 'knowalong-visit-source',
} as const;

export const DOM_IDS = {
  /** The absorb system's injected <style> element (idempotency guard). */
  absorbCss: 'knowalong-absorb-css',
} as const;

/** The mock session's email under EXPO_PUBLIC_DISABLE_AUTH=1. */
export const DEV_AUTH_EMAIL = 'dev@knowalong.app';
