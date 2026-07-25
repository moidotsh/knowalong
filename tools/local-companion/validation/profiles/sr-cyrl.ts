// validation/profiles/sr-cyrl.ts
// Serbian Cyrillic validation profile. Gaj Latinica romanization table
// (1:1 bijection with the 30 Serbian Cyrillic letters) + grammar-
// contradiction rules. Data mirrors the Studio-side profile.
//
// Three Serbian-specific data pieces live here, not in the engine:
//   1. Gaj Latinica romanization table.
//   2. Cyrillic Unicode range (Serbian uses a subset of U+0400–U+04FF;
//      the full block is accepted to avoid brittle per-letter checks).
//   3. POS-vs-property contradiction table.

import type { LanguageProfile } from '../types';

/**
 * Gaj Latinica: 30-letter bijection with Serbian Cyrillic. Note the three
 * digraphs (љ→lj, њ→nj, џ→dž) which the engine's multiset-diff comparator
 * handles by length-weighting.
 */
const GAJ_LOWER: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ',
  е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k',
  л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
  // Uppercase.
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Ђ: 'đ',
  Е: 'e', Ж: 'ž', З: 'z', И: 'i', Ј: 'j', К: 'k',
  Л: 'l', Љ: 'lj', М: 'm', Н: 'n', Њ: 'nj', О: 'o',
  П: 'p', Р: 'r', С: 's', Т: 't', Ћ: 'ć', У: 'u',
  Ф: 'f', Х: 'h', Ц: 'c', Ч: 'č', Џ: 'dž', Ш: 'š',
};

const CASE_TERMS = ['nominative', 'accusative', 'genitive', 'dative', 'instrumental', 'locative', 'vocative'];
const TENSE_TERMS = ['present tense', 'past tense', 'future tense', 'aorist', 'imperfect'];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];
const GENDER_TERMS = ['masculine', 'feminine', 'neuter'];

export const SR_CYRL_PROFILE: LanguageProfile = {
  languageCode: 'sr-cyrl',
  nativeScriptName: 'Serbian Cyrillic',
  // Cyrillic block (U+0400–U+04FF). Serbian uses a 30-letter subset; accepting
  // the full block avoids false rejections for Russian-looking letters (ъ, ы,
  // ь, э, ю, я) the model might emit by mistake — those get caught by the
  // transliteration comparator instead.
  nativeScriptPattern: /[\u0400-\u04FF]/,
  requiresNativeScript: true,
  // Serbian Cyrillic does not mix Latin in canonical form.
  forbiddenLatinWhenNative: true,

  transliteration: {
    required: true,
    schemeName: 'Gaj Latinica',
    charMap: GAJ_LOWER,
    // Digraphs (lj, nj, dž) produce longer transliterations; the per-length
    // floor absorbs the length delta.
    toleranceFor: (surfaceForm) => Math.floor(surfaceForm.length / 5),
  },

  contradictionRules: [
    // Infinitive — note: literary Serbian prefers da-construction ("da + present")
    // over infinitive; when the model emits "infinitive" anyway, apply the rule.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (infinitives are not person/number/case-marked).',
    },
    // Preposition does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS, 'nominative'],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (prepositions are not inflected; do not govern nominative).',
    },
    // Adverb (not adverbial) does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'adverb',
      unlessHas: ['adverbial'],
      forbiddenProps: [...CASE_TERMS, ...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adverb" cannot carry "${prop}" (adverbs are not inflected).',
    },
    // Conjunction does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...GENDER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "conjunction" cannot carry "${prop}".',
    },
    // Numerals/cardinals/ordinals do not carry tense/person.
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
    // Particle does not carry tense/person/gender.
    {
      kind: 'pos-prop',
      posToken: 'particle',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "particle" cannot carry "${prop}".',
    },
    // Noun (not pronoun) does not carry verbal properties.
    {
      kind: 'pos-prop',
      posToken: 'noun',
      unlessHas: ['pronoun', 'noun phrase'],
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "noun" cannot carry verbal property "${prop}".',
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
  ],

  realizationTypeConstraints: [
    {
      realizationType: 'word',
      rejectsSurfaceFormPattern: /\s/,
      reason: 'realizationType "word" but surfaceForm contains whitespace (use "phrase" or "construction" for multi-token forms).',
    },
  ],
};
