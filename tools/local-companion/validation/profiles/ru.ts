// validation/profiles/ru.ts
// Russian validation profile. Fully populated in this checkpoint. The three
// Russian-specific DATA pieces live here, not in the engine:
//   1. ISO 9:1995 romanization table (ISO9_LOWER).
//   2. Cyrillic Unicode range (nativeScriptPattern).
//   3. ё→yo tolerance formula (transliteration.toleranceFor).
// The engine reads these generically; it references no Russian strings.

import type { LanguageProfile } from '../types';

/** ISO 9:1995 romanization (lowercase). ASCII-friendly variant the Stage 2
 *  prompt instructs the model to follow (я→ya, ж→zh, ш→sh, щ→shch, ц→ts,
 *  ч→ch, ы→y, й→y, ю→yu, я→ya, ъ→'', ь→''). ё maps to "e" here; the
 *  toleranceFor callback lets the model emit "yo" for ё and still pass. */
const ISO9_LOWER: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e',
  ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

const CASE_TERMS = [
  'nominative', 'accusative', 'genitive', 'dative',
  'instrumental', 'prepositional', 'locative',
];
const TENSE_TERMS = ['present tense', 'past tense', 'future tense'];
const PERSON_TERMS = ['first person', 'second person', 'third person'];
const NUMBER_TERMS = ['singular', 'plural'];
const GENDER_TERMS = ['masculine', 'feminine', 'neuter', 'common'];

export const RU_PROFILE: LanguageProfile = {
  languageCode: 'ru',
  nativeScriptName: 'Cyrillic',
  nativeScriptPattern: /[\u0400-\u04FF\u0500-\u052F]/,
  requiresNativeScript: true,
  forbiddenLatinWhenNative: true,

  transliteration: {
    required: true,
    schemeName: 'ISO 9:1995',
    charMap: ISO9_LOWER,
    // ё→yo expands one Cyrillic char into two Latin chars; grant +3 per ё
    // so the model emitting "yo" (vs the canonical ё→"e" mapping) still passes.
    toleranceFor: (surfaceForm) =>
      3 * (surfaceForm.toLowerCase().match(/ё/g) ?? []).length,
  },

  contradictionRules: [
    // Infinitive cannot co-occur with tense/person/number/case.
    {
      kind: 'pos-prop',
      posToken: 'infinitive',
      forbiddenProps: [...TENSE_TERMS, ...PERSON_TERMS, ...NUMBER_TERMS, ...CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (infinitives are not tensed/person/number/case-marked).',
    },
    // Preposition does not inflect for tense/person/number/gender and does not govern nominative.
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
    // Verb (not participle/gerund/adverbial) cannot carry case + number agreement.
    {
      kind: 'pos-combo',
      posToken: 'verb',
      unlessHas: ['participle', 'gerund', 'adverbial'],
      requiresOneFromEach: [CASE_TERMS, NUMBER_TERMS],
      reason: 'grammar-note contradiction: a finite/infinitive verb cannot carry case + number agreement (only participles and gerunds can).',
    },
    // Noun (not pronoun, not noun phrase) does not carry verbal properties.
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
