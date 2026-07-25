// validation/profiles/sr-cyrl.ts
// Serbian Cyrillic validation profile. Gaj Latinica romanization table
// (1:1 bijection with the 30 Serbian Cyrillic letters) + grammar-
// contradiction rules sourced from bcs-shared.ts (script-independent BCS
// grammar). Data mirrors the Studio-side profile per Invariant 10.
//
// Three Serbian-specific data pieces live here, not in the engine:
//   1. Gaj Latinica romanization table (lowercase only — the engine
//      lowercases both sides before comparing).
//   2. Cyrillic Unicode range (Serbian uses a subset of U+0400–U+04FF;
//      the full block is accepted to avoid brittle per-letter checks).
//   3. POS-vs-property contradiction rules (via bcsSharedContradictionRules).

import type { LanguageProfile } from '../types';
import { bcsSharedContradictionRules } from './bcs-shared';

/**
 * Gaj Latinica: 30-letter bijection with Serbian Cyrillic. Note the three
 * digraphs (љ→lj, њ→nj, џ→dž) which the engine's multiset-diff comparator
 * handles by length-weighting. Lowercase only — the engine lowercases both
 * sides before comparing. */
const GAJ_LATIN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ',
  'е': 'e', 'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k',
  'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'ć', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č', 'џ': 'dž', 'ш': 'š',
};

export const SR_CYRL_PROFILE: LanguageProfile = {
  languageCode: 'sr-cyrl',
  nativeScriptName: 'Serbian Cyrillic',
  // Cyrillic block (U+0400–U+04FF). Serbian uses a 30-letter subset; accepting
  // the full block avoids false rejections for Russian-looking letters (ъ, ы,
  // ь, э, ю, я) the model might emit by mistake — those get caught by the
  // transliteration comparator and the orthography constraints instead.
  nativeScriptPattern: /[\u0400-\u04FF]/,
  requiresNativeScript: true,
  // Serbian Cyrillic does not mix Latin in canonical form.
  forbiddenLatinWhenNative: true,

  // Serbian-specific orthography constraints. Three within-Cyrillic
  // confusables: Russian-only, Ukrainian-only, Belarusian-only letters
  // that pass nativeScriptPattern but aren't in Serbian's 30-letter
  // alphabet. The engine's SCRIPT_MIXED check already catches Latin-in-
  // Cyrillic; these are non-overlapping.
  orthographyConstraints: [
    // 1. Russian-only: Ё/ё Ъ/ъ Ы/ы Э/э
    {
      rejectsCharPattern: /[\u0401\u0451\u042A\u044A\u042B\u044B\u042D\u044D]/,
      reason: 'Russian-only Cyrillic letter (Ё/ё Ъ/ъ Ы/ы Э/э) in Serbian text: Serbian Cyrillic has 30 letters and does not use these. Remove the Russian text bleed.',
    },
    // 2. Ukrainian-only: Є/є І/і Ї/ї Ґ/ґ
    {
      rejectsCharPattern: /[\u0404\u0454\u0406\u0456\u0407\u0457\u0490\u0491]/,
      reason: 'Ukrainian-only Cyrillic letter (Є/є І/і Ї/ї Ґ/ґ) in Serbian text: Serbian Cyrillic does not use these letters. Remove the Ukrainian text bleed.',
    },
    // 3. Belarusian-only: Ў/ў (і already covered by Ukrainian set)
    {
      rejectsCharPattern: /[\u040E\u045E]/,
      reason: 'Belarusian-only Cyrillic letter (Ў/ў) in Serbian text: Serbian Cyrillic does not use this letter. Remove the Belarusian text bleed.',
    },
  ],

  transliteration: {
    required: true,
    schemeName: 'Gaj Latinica',
    charMap: GAJ_LATIN,
    // Digraphs (lj, nj, dž) produce longer transliterations; the per-length
    // floor absorbs the length delta. Harmonized with Studio at len/6.
    toleranceFor: (surfaceForm) => Math.floor(surfaceForm.length / 6),
  },

  contradictionRules: bcsSharedContradictionRules(),

  realizationTypeConstraints: [
    {
      realizationType: 'word',
      rejectsSurfaceFormPattern: /\s/,
      reason: 'realizationType "word" but surfaceForm contains whitespace (use "phrase" or "construction" for multi-token forms).',
    },
  ],
};
