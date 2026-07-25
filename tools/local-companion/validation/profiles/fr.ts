// validation/profiles/fr.ts (companion)
// lib/validation/profiles/fr.ts (Studio — vendored mirror)
//
// French validation profile. Latin script with diacritics — transliteration
// is identity (no scheme registered). Grammar-note contradiction rules cover
// the French-specific POS-vs-property exclusions the model is most likely
// to confuse (tense on infinitives, case on nouns calqued from Russian/BCS,
// gender+number on adjectives that agree, multi-gender / multi-number
// listings). See ARCHITECTURE.md → S12 (Studio) and the companion docs.
//
// This file is a vendored mirror per Invariant 10:
//   companion: knowalong/tools/local-companion/validation/profiles/fr.ts
//   Studio:    knowalong-studio/lib/validation/profiles/fr.ts
// Both copies must stay byte-identical from `const CASE_TERMS` down.

import type { LanguageProfile } from '../types';

// French grammatical-term vocabulary as the model emits it. French has NO
// grammatical case — CASE_TERMS exist to REJECT them (the model sometimes
// emits "noun, dative" calqued from Russian/BCS). French has TWO genders
// (masculine/feminine) and TWO numbers (singular/plural); both are
// productive for noun/adjective agreement.
const CASE_TERMS = [
  'nominative', 'accusative', 'genitive', 'dative',
];
// French tense/mood inventory. Real tenses + the listed moods (conditional,
// subjunctive, imperative) appear here so the exclusive-category rule fires
// on multi-tense listings. NOTE: 'infinitive' and 'participle' are
// deliberately NOT in this list. 'infinitive' would self-conflict with the
// infinitive pos-prop rule below (the engine's has()-match doesn't exclude
// the POS token from forbiddenProps). 'participle' would false-fire the
// multi-tense rule on legitimate "present participle" / "past participle"
// notes. Both categories are owned by their POS rules and the reviewer.
const TENSE_TERMS = [
  'present tense', 'past tense', 'future tense',
  'imperfect', 'passé composé', 'passé simple',
  'pluperfect', 'plus-que-parfait',
  'conditional', 'subjunctive', 'imperative',
];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];
const GENDER_TERMS = ['masculine', 'feminine'];

export const FR_PROFILE: LanguageProfile = {
  languageCode: 'fr',
  nativeScriptName: 'Latin',
  // Latin block incl. Latin-1 Supplement diacritics (À-ÿ).
  nativeScriptPattern: /[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF]/,
  // French is Latin-script; the script check is advisory-only (do not reject
  // a clean Latin surfaceForm for "no native script").
  requiresNativeScript: false,
  // No mixed-script rule — French legitimately uses only Latin.
  forbiddenLatinWhenNative: false,

  // French orthography constraints. Five script-bleed / confusable rules:
  // Cyrillic, Greek, Arabic, Hebrew (all cross-script), plus a tight set of
  // unambiguous non-French Latin letters (ñ Spanish, ß German, ð/þ
  // Icelandic). French shares Latin script with many languages, so the
  // within-Latin checks target only letters that never appear in canonical
  // French. The reviewer carries more of the within-Latin load (register
  // confusion, calqued constructions, lexical misuse).
  orthographyConstraints: [
    // 1. Cyrillic block — Russian text bleed
    {
      rejectsCharPattern: /[\u0400-\u04FF]/,
      reason: 'Cyrillic letter in French text: French uses Latin script. Remove the Russian text bleed.',
    },
    // 2. Greek block — math/style bleed
    {
      rejectsCharPattern: /[\u0370-\u03FF]/,
      reason: 'Greek letter in French text: French uses Latin script. Remove the Greek character.',
    },
    // 3. Arabic block — RTL script bleed
    {
      rejectsCharPattern: /[\u0600-\u06FF]/,
      reason: 'Arabic letter in French text: French uses Latin script. Remove the Arabic text bleed.',
    },
    // 4. Hebrew block — RTL script bleed
    {
      rejectsCharPattern: /[\u0590-\u05FF]/,
      reason: 'Hebrew letter in French text: French uses Latin script. Remove the Hebrew character.',
    },
    // 5. Non-French Latin confusables — unambiguous Spanish/German/Icelandic
    //    text bleed. ñ (U+00F1) is Spanish; ß (U+00DF) is German;
    //    ð (U+00F0) and þ (U+00FE) are Icelandic. None appear in canonical
    //    French. (French uses "gn" for /ɲ, not "ñ".)
    {
      rejectsCharPattern: /[\u00F1\u00DF\u00F0\u00FE]/,
      reason: 'Non-French Latin letter (ñ/ß/ð/þ) in French text: Spanish/German/Icelandic text bleed. French uses Latin script with only é/è/ê/ë/à/â/ù/û/ô/î/ï/ç/œ/æ diacritics.',
    },
  ],

  transliteration: {
    required: false,
    schemeName: 'identity',
    charMap: {},
    toleranceFor: () => 0,
  },

  contradictionRules: [
    // Infinitive cannot co-occur with person/number/tense/case. French
    // infinitives (-er/-ir/-re/-oir) are tense-less and non-inflecting.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...TENSE_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (French infinitives are tense-less and non-inflecting).',
    },
    // Preposition does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (prepositions are not inflected).',
    },
    // Conjunction does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "conjunction" cannot carry "${prop}".',
    },
    // Adverb does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'adverb',
      unlessHas: ['adverbial'],
      forbiddenProps: [...CASE_TERMS, ...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adverb" cannot carry "${prop}" (adverbs are not inflected).',
    },
    // Determiner / article does not carry tense/person.
    {
      kind: 'pos-prop',
      posToken: 'determiner',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "determiner" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop',
      posToken: 'article',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "article" cannot carry "${prop}".',
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
    // Noun: French nouns carry gender (masc/fem) + number (sg/pl) but NOT
    // tense/person/case. The unlessHas guards the rare cases where the
    // model labels a syntactic chunk.
    {
      kind: 'pos-prop',
      posToken: 'noun',
      unlessHas: ['pronoun', 'noun phrase'],
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "noun" cannot carry "${prop}" (French nouns carry gender + number but not tense/person/case; French has no case system).',
    },
    // Adjective: French adjectives agree in gender + number (unlike Armenian
    // where adjectives are indeclinable). Forbids ONLY tense/person/case.
    // The unlessHas 'participle' guard protects past participles used
    // adjectivally ("les portes fermées" — fermées is a past participle
    // agreeing in fem.pl., carrying "past tense").
    {
      kind: 'pos-prop',
      posToken: 'adjective',
      unlessHas: ['participle'],
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adjective" cannot carry "${prop}" (French adjectives agree in gender + number but not tense/person/case; if the form carries tense, label it "participle").',
    },
    // Multi-tense-listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'tense',
      terms: TENSE_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple tenses (${matched}).',
    },
    // Multi-person-listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'person',
      terms: PERSON_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple persons (${matched}).',
    },
    // Multi-number-listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'number',
      terms: NUMBER_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple numbers (${matched}).',
    },
    // Multi-gender-listing contradiction.
    {
      kind: 'exclusive-category',
      category: 'gender',
      terms: GENDER_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple genders (${matched}).',
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
