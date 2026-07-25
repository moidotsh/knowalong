// validation/profiles/hy.ts
// Armenian validation profile. ISO 9985 transliteration table + grammar-
// contradiction rules shared in shape with the Studio-side profile (the
// engine on both sides is the same language-agnostic core). The three
// Armenian-specific data pieces live here, not in the engine:
//   1. ISO 9985 romanization table (lowercase).
//   2. Armenian Unicode range (U+0530–U+058F) + Alphabetic Presentation
//      Forms ligatures (U+FB13–U+FB17).
//   3. POS-vs-property contradiction table.

import type { LanguageProfile } from '../types';

/** ISO 9985:1995 romanization (lowercase). Eastern Armenian default. */
const ISO9985_LOWER: Record<string, string> = {
  ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'ē',
  ը: 'ə', թ: 'tʿ', ժ: 'ž', ի: 'i', լ: 'l', խ: 'x', ծ: 'ç',
  կ: 'k', հ: 'h', ձ: 'dz', ղ: 'ł', ճ: 'č', մ: 'm', յ: 'y',
  ն: 'n', շ: 'š', ո: 'o', չ: 'čʿ', պ: 'p', ջ: 'j', ռ: 'ṙ',
  ս: 's', վ: 'v', տ: 't', ր: 'r', ց: 'cʿ', ւ: 'w', փ: 'pʿ',
  ք: 'kʿ', օ: 'ō', ֆ: 'f', և: 'ev',
  // Uppercase (Armenian has case). The engine lowercases both sides before
  // comparing, but including these keeps the table self-documenting.
  Ա: 'a', Բ: 'b', Գ: 'g', Դ: 'd', Ե: 'e', Զ: 'z', Է: 'ē',
  Ը: 'ə', Թ: 'tʿ', Ժ: 'ž', Ի: 'i', Լ: 'l', Խ: 'x', Ծ: 'ç',
  Կ: 'k', Հ: 'h', Ձ: 'dz', Ղ: 'ł', Ճ: 'č', Մ: 'm', Յ: 'y',
  Ն: 'n', Շ: 'š', Ո: 'o', Չ: 'čʿ', Պ: 'p', Ջ: 'j', Ռ: 'ṙ',
  Ս: 's', Վ: 'v', Տ: 't', Ր: 'r', Ց: 'cʿ', Ւ: 'w', Փ: 'pʿ',
  Ք: 'kʿ', Օ: 'ō', Ֆ: 'f', ԵՎ: 'ev',
};

const CASE_TERMS = ['nominative', 'accusative', 'genitive', 'dative', 'ablative', 'instrumental', 'locative'];
const TENSE_TERMS = ['present tense', 'past tense', 'future tense', 'aorist'];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];

export const HY_PROFILE: LanguageProfile = {
  languageCode: 'hy',
  nativeScriptName: 'Armenian',
  // Armenian core block (U+0530–U+058F) + Alphabetic Presentation Forms
  // ligatures (U+FB13–U+FB17: ﬓ ﬔ ﬕ ﬖ ﬗ).
  nativeScriptPattern: /[\u0530-\u058F\uFB13-\uFB17]/,
  requiresNativeScript: true,
  // Armenian does not mix Latin in canonical form; flag mixed-script surfaceForms.
  forbiddenLatinWhenNative: true,

  transliteration: {
    required: true,
    schemeName: 'ISO 9985:1995',
    charMap: ISO9985_LOWER,
    // ISO 9985 uses modifier letters (tʿ, čʿ, ṙ) that small models often
    // render as plain ASCII (t', c', r). Allow ~1 char-diff per 5 chars of
    // surface form to absorb those substitutions.
    toleranceFor: (surfaceForm) => Math.floor(surfaceForm.length / 5),
  },

  contradictionRules: [
    // Infinitive cannot co-occur with person/number/case.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (infinitives are not person/number/case-marked).',
    },
    // Preposition does not inflect for tense/person/number/gender and does not govern nominative.
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, 'nominative'],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (prepositions are not inflected; do not govern nominative).',
    },
    // Conjunction does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
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
    // Particle does not carry tense/person.
    {
      kind: 'pos-prop',
      posToken: 'particle',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "particle" cannot carry "${prop}".',
    },
    // Noun (not pronoun) does not carry verbal properties.
    {
      kind: 'pos-prop',
      posToken: 'noun',
      unlessHas: ['pronoun'],
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
