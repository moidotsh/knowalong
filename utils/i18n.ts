// utils/i18n.ts
//
// The bilingual seam — the shell's opt-in typed-catalog harness for
// consumers shipping more than one language. The starter's own screens
// stay English; a bilingual consumer builds slices against this seam
// and migrates surfaces one at a time.
//
// The discipline (learned the hard way, kept load-bearing here):
//
//   • ONE source language owns the truth. Every other language is a
//     MIRROR typed as the source's shape — a missing or extra key in a
//     mirror is a compile error, not a runtime blank. The harness's
//     `createStringsCatalog(source, mirrors)` typing enforces it: each
//     mirror value must satisfy the source object's full type.
//   • `t(lang)` is PURE — golden-testable, callable outside React.
//     `useT()` subscribes the persisted lang store so every mounted
//     surface re-renders in place on toggle.
//   • Slices are consumer-owned. The shell ships no catalog; a
//     consumer's slice-per-surface files never touch a neighbor's.
//   • The document follows the store: `setLang` mirrors the live lang
//     onto `<html lang>` (screen readers and translation tooling read
//     it), and `initDocumentLang()` covers boot + persist rehydrate.
//   • Content is not chrome: catalog strings are UI chrome (labels,
//     titles, buttons). People's words and product names never
//     translate — those stay data.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isWeb, hasDocument } from './platform';
import { zustandStorage } from '../stores';
import { STORAGE_KEYS } from '../constants';

// ─── Language type ─────────────────────────────────────────────────────

/**
 * The languages the seam supports. The starter ships en + fr; a
 * consumer edits this union (and DEFAULT_LANG) in the same change as
 * its first catalog slice — the type error list is the migration map.
 */
export type Lang = 'en' | 'fr';

/** The default language — the source of truth for catalog authoring. */
export const DEFAULT_LANG: Lang = 'en';

const LANGS: readonly Lang[] = ['en', 'fr'];

/**
 * Normalize any persisted (possibly corrupt or retired) value back to
 * a live Lang. A hand-edited localStorage value or a removed language
 * must never crash a surface — it falls back to the default.
 */
export function resolveLang(value: unknown): Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
    ? (value as Lang)
    : DEFAULT_LANG;
}

// ─── The lang store ────────────────────────────────────────────────────
// d10-exempt: one persisted field + one setter — not domain state; the
// canonical Loading/Error/Modals/Selection/UI sections don't apply.

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      setLang: (lang) => {
        set({ lang });
        syncDocumentLang(lang);
      },
    }),
    {
      name: STORAGE_KEYS.langStore,
      storage: createJSONStorage(() => zustandStorage),
      merge: (persisted, current) => ({
        ...current,
        ...(typeof persisted === 'object' && persisted != null
          ? { lang: resolveLang((persisted as { lang?: unknown }).lang) }
          : {}),
      }),
    },
  ),
);

/** Set the language from anywhere (non-reactive call sites). */
export function setLang(lang: Lang): void {
  useLangStore.getState().setLang(lang);
}

// ─── The document mirror ───────────────────────────────────────────────

/** Mirror the live lang onto <html lang> — web only, idempotent. */
export function syncDocumentLang(lang: Lang): void {
  if (!isWeb || !hasDocument()) return;
  document.documentElement.lang = lang;
}

/**
 * Boot-time mirror: cover the cold start AND the persist rehydrate
 * (which lands after first paint). Call once from a web-only effect in
 * the root layout; the returned unsubscribe is for tests — the page
 * lifetime mirror is document-level and the store outlives the layout.
 */
export function initDocumentLang(): () => void {
  syncDocumentLang(useLangStore.getState().lang);
  // The rehydrate may land after this call; one subscription covers it.
  return useLangStore.subscribe((s) => syncDocumentLang(s.lang));
}

// ─── The catalog harness ───────────────────────────────────────────────

/**
 * Build a bilingual catalog. `source` is the source-language object
 * (the source of truth); each mirror must satisfy the SAME shape —
 * TypeScript rejects a mirror with a missing or extra key, which is
 * the entire point: a untranslated string is a compile error, never a
 * runtime blank.
 *
 * ```ts
 * const { t, useT } = createStringsCatalog(
 *   { greeting: 'Welcome', cta: 'Start' },
 *   { fr: { greeting: 'Bienvenue', cta: 'Commencer' } },
 * );
 * t('fr').cta        // 'Commencer'
 * useT().cta         // the live language, reactive
 * ```
 *
 * `t(lang)` falls back to the source language for any language without
 * a mirror — an unmirrored language reads source-language chrome
 * rather than blanks (deliberate: partial migrations ship).
 */
export function createStringsCatalog<S extends object>(source: S, mirrors: {
  [L in Lang]?: S;
}) {
  const t = (lang: Lang): S => mirrors[lang] ?? source;
  const useT = (): S => t(useLangStore((s) => s.lang));
  return { t, useT, source };
}
