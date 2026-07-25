// validation/profiles/bs-latn.ts
// BCS Latin (Bosnian/Croatian/Serbian Latin) validation profile. Latin
// script with Gaj's orthography (č, ć, đ, š, ž, dž, lj, nj) — no
// transliteration scheme (identity passthrough; transliteration IS the
// surface form). Grammar contradiction rules mirror sr-cyrl since BCS
// grammar is script-independent.

import type { LanguageProfile } from '../types';

const CASE_TERMS = ['nominative', 'accusative', 'genitive', 'dative', 'instrumental', 'locative', 'vocative'];
const TENSE_TERMS = ['present tense', 'past tense', 'future tense', 'aorist', 'imperfect'];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];
const GENDER_TERMS = ['masculine', 'feminine', 'neuter'];

export const BS_LATN_PROFILE: LanguageProfile = {
  languageCode: 'bs-latn',
  nativeScriptName: "Latin (Gaj's orthography)",
  // Latin block incl. Latin-1 Supplement diacritics (À-ÿ) covers č/ć/đ/š/ž.
  nativeScriptPattern: /[\u0041-\u005A\u0061-\u007A\u00C0-\u024F]/,
  // Latin script — advisory-only (do not reject a clean Latin surfaceForm).
  requiresNativeScript: false,
  // No mixed-script rule — Latin is canonical.
  forbiddenLatinWhenNative: false,

  transliteration: {
    required: false,
    schemeName: 'identity',
    charMap: {},
    toleranceFor: () => 0,
  },

  contradictionRules: [
    // Same grammar shape as sr-cyrl — BCS grammar is script-independent.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (infinitives are not person/number/case-marked).',
    },
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS, 'nominative'],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (prepositions are not inflected; do not govern nominative).',
    },
    {
      kind: 'pos-prop',
      posToken: 'adverb',
      unlessHas: ['adverbial'],
      forbiddenProps: [...CASE_TERMS, ...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adverb" cannot carry "${prop}" (adverbs are not inflected).',
    },
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "conjunction" cannot carry "${prop}".',
    },
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
    {
      kind: 'pos-prop',
      posToken: 'particle',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "particle" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop',
      posToken: 'noun',
      unlessHas: ['pronoun', 'noun phrase'],
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "noun" cannot carry verbal property "${prop}".',
    },
    {
      kind: 'exclusive-category',
      category: 'tense',
      terms: TENSE_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple tenses (${matched}).',
    },
    {
      kind: 'exclusive-category',
      category: 'person',
      terms: PERSON_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple persons (${matched}).',
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
