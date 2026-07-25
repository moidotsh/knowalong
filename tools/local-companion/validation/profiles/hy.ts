// validation/profiles/hy.ts
// Armenian validation profile. ISO 9985:1996 transliteration table + grammar-
// contradiction rules shared in shape with the Studio-side profile (the
// engine on both sides is the same language-agnostic core). The three
// Armenian-specific data pieces live here, not in the engine:
//   1. ISO 9985:1996 romanization table (lowercase).
//   2. Armenian Unicode range (U+0530–U+058F) + Alphabetic Presentation
//      Forms ligatures (U+FB13–U+FB17).
//   3. POS-vs-property contradiction table.
//
// Invariant 10 (knowalong-studio/CLAUDE.md): the sibling
// knowalong-studio/lib/validation/profiles/hy.ts mirrors this file byte-
// for-byte from `export const HY_PROFILE` down. The header comment above
// may differ; the export may not.

import type { LanguageProfile } from '../types';

/** ISO 9985:1996 romanization (lowercase). Eastern Armenian default. */
const ISO_9985_LOWER: Record<string, string> = {
  ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'ē',
  ը: 'ə', թ: 'tʿ', ժ: 'ž', ի: 'i', լ: 'l', խ: 'x', ծ: 'ç',
  կ: 'k', հ: 'h', ձ: 'dz', ղ: 'ł', ճ: 'č', մ: 'm', յ: 'y',
  ն: 'n', շ: 'š', ո: 'o', չ: 'čʿ', պ: 'p', ջ: 'j', ռ: 'ṙ',
  ս: 's', վ: 'v', տ: 't', ր: 'r', ց: 'cʿ', ւ: 'w', փ: 'pʿ',
  ք: 'kʿ', օ: 'ō', ֆ: 'f', և: 'ev',
};

const CASE_TERMS = [
  'nominative', 'accusative', 'genitive', 'dative',
  'ablative', 'instrumental', 'locative',
];
// UNION of the historical companion (4) + Studio (7) term lists. Armenian
// has all eight as legitimate tense/mood labels. Persian has 7 (no aorist).
const TENSE_TERMS = [
  'present tense', 'past tense', 'future tense',
  'imperfect', 'aorist', 'conditional', 'subjunctive', 'imperative',
];
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
    schemeName: 'ISO 9985:1996',
    charMap: ISO_9985_LOWER,
    // ISO 9985 uses modifier letters (tʿ, čʿ, ṙ) that small models often
    // render as plain ASCII (t', c', r'). len/6 absorbs ~1 such substitution
    // per 6 chars of surface form, reducing false TRANSLIT_MISMATCH
    // rejections. The engine lowercases both sides before comparing, so the
    // table ships lowercase entries only.
    toleranceFor: (surfaceForm) => Math.floor(surfaceForm.length / 6),
  },

  contradictionRules: [
    // Armenian infinitives end in -ել (-el) or -ալ (-al). Tense-less and
    // non-inflecting.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...PERSON_TERMS, ...NUMBER_TERMS, ...TENSE_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (Armenian infinitives are tense-less and non-inflecting).',
    },
    // Preposition does not inflect. Armenian prepositions govern oblique
    // cases (e.g. ի + dative) but never carry inflection themselves and
    // never govern the nominative.
    {
      kind: 'pos-prop',
      posToken: 'preposition',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, 'nominative'],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (Armenian prepositions are flat; do not govern nominative).',
    },
    // Conjunction does not inflect.
    {
      kind: 'pos-prop',
      posToken: 'conjunction',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
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
    // Particle is invariable. Armenian particles (չ-, մ-, copulative եմ
    // forms, etc.) carry no tense/person/number.
    {
      kind: 'pos-prop',
      posToken: 'particle',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "particle" cannot carry "${prop}" (Armenian particles are invariable).',
    },
    // Noun (not pronoun / not "noun phrase" label) does not carry verbal
    // properties.
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
