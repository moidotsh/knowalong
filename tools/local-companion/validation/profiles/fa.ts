// validation/profiles/fa.ts
// Persian validation profile. Persian-Arabic script (with the Persian-
// specific letters پ چ گ ژ ک ی). Grammar-note contradiction rules cover
// Persian-specific POS-vs-property exclusions. Transliteration fidelity
// is reviewer-owned for fa (see comment on `charMap` below).

import type { LanguageProfile } from '../types';

// Persian grammatical-term vocabulary as the model emits it. Persian
// has no grammatical gender, but does inflect for person/number on verbs
// and uses EZÂFE constructions for possession.
const CASE_TERMS = [
  'nominative', 'accusative', 'genitive', 'dative',
];
const TENSE_TERMS = [
  'present tense', 'past tense', 'future tense',
  'imperfect', 'conditional', 'subjunctive', 'imperative',
];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];

export const FA_PROFILE: LanguageProfile = {
  languageCode: 'fa',
  nativeScriptName: 'Persian-Arabic',
  // Arabic block + Arabic Presentation Forms-A/B cover Persian/Arabic script.
  nativeScriptPattern: /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
  requiresNativeScript: true,
  // Persian does not mix Latin; flag mixed-script surfaceForms.
  forbiddenLatinWhenNative: true,

  transliteration: {
    required: true,
    schemeName: 'BGN/PCGN',
    // Empty charMap by design. Persian is an abjad: short vowels are
    // unwritten and و/ی are context-dependent, so char-by-char mapping
    // produces false TRANSLIT_MISMATCH rejections on valid words. The
    // script check (nativeScriptPattern) still enforces Persian-Arabic
    // surfaceForms; transliteration fidelity is left to the reviewer. The
    // deterministic display transliteration lives in
    // lib/transliteration/profiles/fa.ts (BGN/PCGN Persian 1956) and is
    // unaffected.
    charMap: {},
    toleranceFor: () => 0,
  },

  contradictionRules: [
    // Persian infinitives end in ـَـن (-an). They are tense-less and
    // non-inflecting.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...TENSE_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (Persian infinitives are tense-less and non-inflecting).',
    },
    // Preposition does not inflect. Persian prepositions are flat.
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (Persian prepositions are flat).',
    },
    // Conjunction does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "conjunction" cannot carry "${prop}".',
    },
    // Adverb (not adverbial) does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'adverb',
      unlessHas: ['adverbial'],
      forbiddenProps: [...CASE_TERMS, ...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adverb" cannot carry "${prop}" (adverbs are not inflected).',
    },
    // Numeral/cardinal/ordinal do not carry tense/person.
    {
      kind: 'pos-prop',
      posToken: 'numeral',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "numeral" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop',
      posToken: 'cardinal',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "cardinal" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop',
      posToken: 'ordinal',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "ordinal" cannot carry "${prop}".',
    },
    // Multi-tense listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'tense',
      terms: TENSE_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple tenses (${matched}).',
    },
    // Multi-person listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'person',
      terms: PERSON_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple persons (${matched}).',
    },
    // Multi-number contradiction (Persian verbs/nouns inflect for
    // singular/plural via ها/ان; one form carries one number).
    {
      kind: 'exclusive-category',
      category: 'number',
      terms: NUMBER_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple numbers (${matched}).',
    },
  ],

  realizationTypeConstraints: [
    {
      realizationType: 'word',
      rejectsSurfaceFormPattern: /\s/,
      reason: 'realizationType "word" but surfaceForm contains whitespace (use "phrase" or "construction" for multi-token forms).',
    },
  ],
};
