// validation/profiles/bcs-shared.ts (companion)
// lib/validation/profiles/bcs-shared.ts (Studio — vendored mirror)
//
// Shared BCS (Bosnian/Croatian/Serbian) grammar data. BCS grammar is
// script-independent: the same cases, tenses, persons, numbers, genders,
// and POS-vs-property exclusions apply whether the surface form is Serbian
// Cyrillic or Gaj Latin. This module holds the canonical term lists and
// contradiction-rule factory consumed by both sr-cyrl.ts and bs-latn.ts.
//
// INTERNAL module — not re-exported via profiles/index.ts. Imported only by
// the two BCS per-script profiles. The public API (SR_CYRL_PROFILE,
// BS_LATN_PROFILE exports) is unchanged.
//
// This file is itself a vendored mirror per Invariant 10:
//   companion: knowalong/tools/local-companion/validation/profiles/bcs-shared.ts
//   Studio:    knowalong-studio/lib/validation/profiles/bcs-shared.ts
// Both copies must stay byte-identical from this comment block down.

import type { ContradictionRule } from '../types';

// ── Term vocabulary ─────────────────────────────────────────────────────

/** BCS has seven cases. Dative and locative are syncretic (identical forms
 *  in most declensions); noting "dative/locative" together is correct, not
 *  a contradiction. The exclusive-category rules do NOT include cases. */
export const BCS_CASE_TERMS = [
  'nominative', 'genitive', 'dative', 'accusative',
  'vocative', 'instrumental', 'locative',
];

/** Eight tense/mood labels. Harmonized with Armenian's set. "Subjunctive"
 *  as a standalone inflected mood does not exist in BCS — the equivalent
 *  is da + present or the conditional. The term is included because the
 *  model sometimes emits it and the exclusive-category rule needs to
 *  recognize it for multi-tense listings to fire. */
export const BCS_TENSE_TERMS = [
  'present tense', 'past tense', 'future tense',
  'imperfect', 'aorist', 'conditional', 'subjunctive', 'imperative',
];

export const BCS_PERSON_TERMS = ['first person', 'second person', 'third person'];
export const BCS_NUMBER_TERMS = ['singular', 'plural'];

/** Slavic has grammatical gender (unlike Persian/Armenian which have none).
 *  Three genders, intrinsic to the noun lexeme. */
export const BCS_GENDER_TERMS = ['masculine', 'feminine', 'neuter'];

// ── Prompt data (consumed by clccGeneration.ts in the companion) ─────────

/** 15-bullet grammar guidance string injected into the stage-2 prompt's
 *  grammaticalNote field rule. Used by the companion's LANG_PROMPT_DATA. */
export const BCS_GRAMMAR_GUIDANCE = `BCS (Bosnian/Croatian/Serbian) grammar guidance (for grammaticalNote):
- BCS is one language with two scripts: Serbian Cyrillic (sr-cyrl) and Gaj Latin (bs-latn). Grammar is identical across scripts; only orthography differs.
- BCS has SEVEN cases: nominative (subject), genitive (possession/partitive/negation), dative (indirect object), accusative (direct object/motion-toward), vocative (direct address), instrumental (means/by), locative (location/about — always with a preposition). Dative and locative are syncretic (identical forms in most declensions); noting "dative/locative" together is correct.
- BCS has THREE grammatical genders: masculine, feminine, neuter. Gender is intrinsic to the noun lexeme; note it on nouns and on adjectives/participles that agree. Pick ONE gender per form.
- Verbs: pick ONE person (first/second/third person) and ONE number (singular/plural) on a finite verb — never a list. Past-tense l-participles also agree with the subject in gender.
- BCS tense/mood inventory: present tense, future tense (auxiliary hteti + infinitive), past tense (l-participle + auxiliary), aorist (simple past perfective, literary), imperfect (simple past imperfective, literary/rare), conditional (l-participle + bi), imperative, and periphrastic constructions with da + present. "Subjunctive" as a distinct inflected mood does not exist in BCS — use da + present or the conditional instead. Pick ONE tense/mood per form.
- Infinitives end in -ti (e.g. biti, raditi, pisati). Note them as "infinitive"; never mark an infinitive for tense/person/number/case.
- BCS verbs come in aspectual pairs: imperfective (ongoing/repeated) vs perfective (completed). Note the aspect when relevant; pick ONE aspect per form.
- Negation: the negative particle ne is proclitic and written as a separate word before finite verbs (ne znam). Some negated auxiliary forms fuse (ne + sam → nisam, ne + hoću → neću). Note negation as "particle, proclitic" when relevant.
- The interrogative particle li is enclitic and follows the verb or focused element (Da li..., Hoćeš li..., Je l'...). Note it when relevant.
- Prepositions govern specific cases: u/na + accusative (motion-toward) or + locative (location); s/sa + instrumental; za + accusative/instrumental; o + locative. Note the governed case.
- Adjectives inflect for case, number, and gender (unlike Persian/Armenian where adjectives do not inflect). Definite vs indefinite adjective distinction is marked in Serbian (long vs short form). Note case/number/gender agreement on adjectives.
- Ekavian vs Ijekavian: Serbian standard defaults to ekavian (lep, reč, vrh), Bosnian/Croatian defaults to ijekavian (lijep, riječ, vrh). Note the variant when relevant; do not mix within a single form.
- Lexical divergence across the three standards: some words differ (hleb/kruh/hljeb "bread", voz/vlak "train", hiljada/tisuća "thousand"). Note the standard variant (Serbian/Bosnian/Croatian) when the form is regionally marked.
- Clitic cluster placement (Wackernagel's law): BCS clitics (auxiliaries, pronominal clitics, the particle li) appear in second position in the clause. Note clitic placement when the form exemplifies it.`;

/** Constructed (not observed) anti-examples for the stage-3 anti-hallucination
 *  callout. Mirror the over-suffixation failure class: the model sometimes
 *  appends an extra -ti to an infinitive that already ends in -ti. Real BCS
 *  infinitives end in single -ti (biti, raditi, govoriti). */
export const BCS_INVENTED_WORD_ANTI_EXAMPLES = ['bititi', 'govorititi'];

// ── Contradiction-rule factory ──────────────────────────────────────────

/** Returns the 14 canonical BCS contradiction rules. Called by both
 *  sr-cyrl.ts and bs-latn.ts. Rules encode POS-vs-property exclusions that
 *  hold regardless of script.
 *
 *  CRITICAL: BCS adjectives DO inflect for case/number/gender (unlike
 *  Armenian where adjectives are indeclinable). The adjective rule forbids
 *  ONLY tense/person. The unlessHas 'participle' guard protects participial
 *  adjectives that carry verbal properties. Getting this wrong would either
 *  false-reject valid adjective forms or false-accept tense on adjectives.
 *
 *  Rule count: 10 pos-prop + 4 exclusive-category = 14. */
export function bcsSharedContradictionRules(): ContradictionRule[] {
  return [
    {
      kind: 'pos-prop', posToken: 'infinitive',
      forbiddenProps: [...BCS_PERSON_TERMS, ...BCS_NUMBER_TERMS, ...BCS_TENSE_TERMS, ...BCS_CASE_TERMS],
      reasonTemplate: 'grammar-note contradiction: "infinitive" cannot co-occur with "${prop}" (BCS infinitives end in -ti and are tense-less, non-inflecting).',
    },
    {
      kind: 'pos-prop', posToken: 'preposition',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS, ...BCS_NUMBER_TERMS, ...BCS_GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "preposition" cannot carry "${prop}" (BCS prepositions are flat).',
    },
    {
      kind: 'pos-prop', posToken: 'conjunction',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS, ...BCS_NUMBER_TERMS, ...BCS_GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "conjunction" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop', posToken: 'adverb',
      unlessHas: ['adverbial'],
      forbiddenProps: [...BCS_CASE_TERMS, ...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS, ...BCS_NUMBER_TERMS, ...BCS_GENDER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adverb" cannot carry "${prop}" (adverbs are not inflected).',
    },
    {
      kind: 'pos-prop', posToken: 'numeral',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "numeral" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop', posToken: 'cardinal',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "cardinal" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop', posToken: 'ordinal',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "ordinal" cannot carry "${prop}".',
    },
    {
      kind: 'pos-prop', posToken: 'particle',
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS, ...BCS_NUMBER_TERMS],
      reasonTemplate: 'grammar-note contradiction: "particle" cannot carry "${prop}" (BCS particles like ne, li are invariable).',
    },
    {
      kind: 'pos-prop', posToken: 'noun',
      unlessHas: ['pronoun', 'noun phrase'],
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "noun" cannot carry verbal property "${prop}".',
    },
    // Adjective: BCS adjectives inflect for case/number/gender (Slavic
    // agreement). Forbids ONLY tense/person. unlessHas 'participle' guards
    // participial adjectives that carry verbal properties.
    {
      kind: 'pos-prop', posToken: 'adjective',
      unlessHas: ['participle'],
      forbiddenProps: [...BCS_TENSE_TERMS, ...BCS_PERSON_TERMS],
      reasonTemplate: 'grammar-note contradiction: "adjective" cannot carry "${prop}" (BCS adjectives inflect for case/number/gender but not tense/person; if the form carries tense, label it "participle").',
    },
    { kind: 'exclusive-category', category: 'tense', terms: BCS_TENSE_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple tenses (${matched}).' },
    { kind: 'exclusive-category', category: 'person', terms: BCS_PERSON_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple persons (${matched}).' },
    { kind: 'exclusive-category', category: 'number', terms: BCS_NUMBER_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple numbers (${matched}).' },
    { kind: 'exclusive-category', category: 'gender', terms: BCS_GENDER_TERMS,
      reasonTemplate: 'grammar-note contradiction: a single form cannot carry multiple genders (${matched}).' },
  ];
}
