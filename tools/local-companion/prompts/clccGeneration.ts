// tools/local-companion/prompts/clccGeneration.ts
// 5-stage CLCC generation prompts. Each concept in the request body is
// realized into the target language. CLCC promotion into concept_realizations
// is DEFERRED for this checkpoint — these prompts produce realization
// proposals only (reviewable / editable / rejectable / exportable).
//
// STAGE 2 (realizations) is the load-bearing prompt. It is written for a
// small local model (llama3.2:3b-class): explicit, with concept labels +
// descriptions embedded when supplied, few-shot examples, the DB enum
// used directly (no linguistic-theory vocabulary), and an explicit anti-
// pattern callout forbidding English-word-plus-Russian-suffix jams.

import type { CompanionClccConceptInput } from '../../../shared/types/knowalong/companion';
import type { RejectionCode } from '../validation';
import { BCS_GRAMMAR_GUIDANCE, BCS_INVENTED_WORD_ANTI_EXAMPLES } from '../validation/profiles/bcs-shared';

export interface ClccPromptInput {
  targetLanguageCode: 'fr' | 'ru' | 'fa' | 'hy' | 'sr-cyrl' | 'bs-latn';
  coreConceptCodes: string[];
  /** Optional catalog metadata; when supplied, the stage-2 prompt embeds it. */
  coreConcepts?: CompanionClccConceptInput[];
  existingRealizationSurfaceForms?: string[];
  /**
   * Stage-2 validated realizations, passed to Stage 3 so the example-sentence
   * prompt can anchor each sentence on the actual surface form produced for
   * that concept. Entries only need code + surfaceForm; the rest of the
   * realization shape is irrelevant at the prompt layer.
   */
  realizations?: Array<{ coreConceptCode: string; surfaceForm: string }>;
  /** Prior-attempt rejections for codes being retried in Stage 2. Each entry
   *  pairs the code with the structured Rejection (code + reason). Rendered in
   *  the Stage 2 retry prompt so the model gets an actionable, language-general
   *  signal. Undefined on a first attempt; populated only on the retry pass. */
  priorRejections?: Array<{
    coreConceptCode: string;
    rejectionCode: RejectionCode;
    reason: string;
  }>;
}

/**
 * Per-language prompt data. The prompt layer is data-driven: each stage-2 /
 * stage-3 string is assembled from this record rather than from branching
 * code, so adding a language is one new entry here + one companion validation
 * profile. The engine + prompt layer are language-agnostic.
 *
 * `translitRequired` drives the schema `required` array toggle. Latin-script
 * languages (fr, bs-latn) set it false; non-Latin (ru, fa, hy, sr-cyrl) set
 * it true.
 */
interface LangPromptData {
  langName: string;
  scriptLabel: string;
  translitRequired: boolean;
  /** Full "REQUIRED for X (use ...)"/"OPTIONAL for X (...)" rule line. */
  translitRuleText: string;
  /** Anti-pattern restatement for the per-language transliteration contract. */
  translitAntiPatternNote: string;
  /** Stage-2 few-shot anchors (FIRST_PERSON / EXIST / NEGATION). */
  fewShotRealizations: string;
  /** Stage-3 few-shot anchors (same concept trio). */
  fewShotSentences: string;
  /** Optional per-language grammar guidance block injected into the stage-2
   *  prompt's grammaticalNote field rule. Undefined for languages whose
   *  grammar hasn't been profiled yet — they get the generic rule only. */
  grammarGuidance?: string;
  /** Invented-word anti-examples for the stage-3 anti-hallucination callout.
   *  Empty array (or omitted) emits the language-general callout instead of
   *  the per-language "(e.g. X, Y are NOT real <Lang>)" form. */
  inventedWordAntiExamples?: string[];
  /** Optional sourceText-orthography anti-pattern note injected into the
   *  stage-3 anti-pattern list. Undefined for languages whose orthography
   *  is reviewer-owned only (e.g. ru — stress marks) or trivially correct. */
  stage3OrthographyAntiPattern?: string;
}

const LANG_PROMPT_DATA: Record<ClccPromptInput['targetLanguageCode'], LangPromptData> = {
  ru: {
    langName: 'Russian',
    scriptLabel: 'Cyrillic',
    translitRequired: true,
    translitRuleText:
      '* REQUIRED for Russian (use ISO 9: я→ya, быть→byt\', не→ne, ё→e/yo, ж→zh, ш→sh, щ→shch, ц→ts, ч→ch, ы→y, й→y, ю→yu, я→ya, ъ→\', ь→\').',
    translitAntiPatternNote:
      '- For Russian, leaving transliteration null/empty (it is REQUIRED).',
    grammarGuidance: `Russian grammar guidance (for grammaticalNote):
- Verbs: pick ONE aspect and note it ("imperfective aspect" OR "perfective aspect"), never both. Note tense + person/number/gender for finite forms; aspect for all verb forms.
- Motion verbs: for motion concepts, prefer the indeterminate (multi-directional) partner (ходить, ездить) unless the concept specifically implies one-way motion (идти, ехать).
- Reflexive: if the verb carries -ся/-сь, note it as reflexive.
- Nouns: note grammatical gender (masculine/feminine/neuter) and animacy when relevant.
- Prepositions: note which case(s) the preposition governs (genitive/dative/accusative/instrumental/prepositional).
- Register: note when relevant (ты/вы; colloquial particles ведь, же).`,
    inventedWordAntiExamples: ['валяя', 'деляю'],
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "я", "transliteration": "ya", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, nominative case, singular", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "быть", "transliteration": "byt'", "gloss": "to be (existential copula)", "grammaticalNote": "verb, infinitive, imperfective aspect", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "не", "transliteration": "ne", "gloss": "not (general negation)", "grammaticalNote": "negation particle, proclitic, unstressed", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Я иду домой.", "transliteration": "Ya idu domoy.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "В Москве есть метро.", "transliteration": "V Moskve yest' metro.", "translation": "There is a metro in Moscow." }
{ "coreConceptCode": "NEGATION", "sourceText": "Я не знаю.", "transliteration": "Ya ne znayu.", "translation": "I don't know." }`,
  },
  fr: {
    langName: 'French',
    scriptLabel: 'Latin (with diacritics)',
    translitRequired: false,
    translitRuleText:
      '* OPTIONAL for French (Latin script — romanization is trivially the surface form itself; you may omit this field for fr).',
    translitAntiPatternNote:
      '- For French, omitting transliteration is fine (Latin script).',
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "je", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "subject pronoun, singular; elides to j' before a vowel", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "construction", "surfaceForm": "il y a", "gloss": "there is / there are (existential)", "grammaticalNote": "impersonal construction; invariant for number", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "construction", "surfaceForm": "ne... pas", "gloss": "not (general negation)", "grammaticalNote": "two-part negation: ne before verb, pas after", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Je vais à la maison.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "Il y a un livre sur la table.", "translation": "There is a book on the table." }
{ "coreConceptCode": "NEGATION", "sourceText": "Je ne sais pas.", "translation": "I don't know." }`,
  },
  fa: {
    langName: 'Persian/Farsi',
    scriptLabel: 'Persian-Arabic',
    translitRequired: true,
    translitRuleText:
      '* REQUIRED for Persian (use BGN/PCGN Persian 1956: آ→ā, ب→b, پ→p, ت→t, ث→s, ج→j, چ→ch, ح→h, خ→kh, د→d, ذ→z, ر→r, ز→z, ژ→zh, س→s, ش→sh, ص→s, ض→z, ط→t, ظ→z, ع→ʿ, غ→gh, ف→f, ق→q, ک→k, گ→g, ل→l, م→m, ن→n, و→v, ه→h, ی→y. Short vowels are unwritten; do not infer them. Examples: من→man, بودن→budan, کتاب→ketāb, نمی‌دانم→nemidānam, خوشحال→khoshhāl).',
    translitAntiPatternNote:
      '- For Persian, leaving transliteration null/empty (it is REQUIRED).',
    grammarGuidance: `Persian grammar guidance (for grammaticalNote):
- Persian has NO grammatical gender. Never write "masculine"/"feminine"/"neuter" for a Persian form.
- Verbs: note person (first/second/third person) and number (singular/plural) for finite forms — pick ONE person and ONE number, never a list. Persian verbs do not inflect for gender.
- Infinitives end in ـَـن (-an). Note them as "infinitive"; never mark an infinitive for tense/person/number.
- Number: pick ONE — "singular" OR "plural" (ها/ان), never both on one form.
- Nouns: note the plural suffix when used (ها or ان). Possession is shown via the ezâfe (-e/-ye), not by case.
- Prepositions: Persian prepositions are flat (no case government, no agreement).
- Compound verbs (light verb + noun, e.g. کار کردن "to work"): note when a realization is a compound verb.
- Register: note written (کتابی) vs spoken (محاوره‌ای) only when the form differs between them.
- Verb stems: Persian verbs have TWO stems — past stem (e.g. رفت→raft) and present stem (e.g. رو→rav). Note which stem a realization is built from; the infinitive is the past stem + ـَـن (-an).
- Person/number endings on finite verbs: 1sg ـَـم, 2sg ـی, 3sg ـَـد, 1pl ـیم, 2pl ـید, 3pl ـَـند. Note the ending explicitly for finite forms.
- Compound verbs (light-verb compounds): Persian has very many noun + کردن/شدن/گرفتن/زدن compounds. Always note when a realization is a compound verb (e.g. کار کردن "to work", یاد گرفتن "to learn", شکست خوردن "to be defeated").
- را (postposition): the specific direct-object marker. Note it on a noun phrase when the form exemplifies the accusative function; do NOT label it "accusative case" (Persian has no case system).
- Plural suffix choice: ها (hā) for inanimates and generic plurals; ان (ān) for animates and high-style prose. Note which when relevant.
- Ezâfe direction: noun -e adjective (کتابِ خوب "the good book"). The ezâfe is unwritten (pronounced -e/-ye) but load-bearing for noun-adjective links; note it where relevant.
- Colloquial vs formal verb endings: formal می‌روم (miravam) vs colloquial میرم (miram). Note when a realization is the colloquial form.`,
    inventedWordAntiExamples: ['رفتنن', 'میکندن'],
    stage3OrthographyAntiPattern:
      '- For Persian sourceText: do NOT drop the ZWNJ (U+200C) in compound-verb prefixes (میرم WRONG; می‌روم RIGHT). Do NOT use Arabic letters where Persian is standard (ي U+064A → ی U+06CC; ك U+0643 → ک U+06A9). Do NOT use Arabic-Indic digits (٤٥٦); use Persian Extended Arabic-Indic (۴۵۶).',
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "من", "transliteration": "man", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, Persian-Arabic script", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "بودن", "transliteration": "budan", "gloss": "to be / to exist (copula)", "grammaticalNote": "verb, infinitive; present-tense copula is often omitted", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "ن", "transliteration": "na", "gloss": "not (verbal negation prefix)", "grammaticalNote": "proclitic/prefix on verbs: می‌روم → نمی‌روم", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "من می‌روم خانه.", "transliteration": "Man miram khaneh.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "در تهران مترو هست.", "transliteration": "Dar Tehran metro hast.", "translation": "There is a metro in Tehran." }
{ "coreConceptCode": "NEGATION", "sourceText": "من نمی‌دانم.", "transliteration": "Man nemidanam.", "translation": "I don't know." }`,
  },
  hy: {
    langName: 'Armenian',
    scriptLabel: 'Armenian (Mesropian)',
    translitRequired: true,
    translitRuleText:
      '* REQUIRED for Armenian (use ISO 9985:1996: ա→a, բ→b, գ→g, դ→d, ե→e, զ→z, է→ē, ը→ə, թ→tʿ, ժ→ž, ի→i, լ→l, խ→x, ծ→ç, կ→k, հ→h, ձ→dz, ղ→ł, ճ→č, մ→m, յ→y, ն→n, շ→š, ո→o, չ→čʿ, պ→p, ջ→j, ռ→ṙ, ս→s, վ→v, տ→t, ր→r, ց→cʿ, ւ→w, փ→pʿ, ք→kʿ, օ→ō, ֆ→f, և→ev. Examples: ես→es, լինել→linel, մայր→mayr, աշխարհ→ašxarh, Հայաստան→Hayastan, չգիտեմ→čgitem, գրքի→grkʿi).',
    translitAntiPatternNote:
      '- For Armenian, leaving transliteration null/empty (it is REQUIRED).',
    grammarGuidance: `Armenian grammar guidance (for grammaticalNote):
- Armenian has NO grammatical gender. Never write "masculine"/"feminine"/"neuter" for an Armenian form.
- Armenian has SEVEN cases: nominative, accusative, genitive, dative, ablative (-ից), instrumental (-ով), locative (-ում). Note the case on a noun when relevant; syncretic forms may note "nominative/accusative" or "genitive/dative" together (that is correct, not a contradiction — the forms are identical).
- Pick ONE person and ONE number on a finite verb (never a list): first/second/third person × singular/plural. Armenian verbs do not inflect for gender.
- Armenian tenses you may note: present tense, past tense (the general past — prefer the specific one if known), imperfect, aorist (the major past perfective — most common past form), future tense, conditional, subjunctive, imperative. Pick ONE per form.
- Infinitives end in -ել (-el) or -ալ (-al). Note them as "infinitive"; never mark an infinitive for tense/person/number/case.
- Verb stems: Armenian verbs have TWO stems — present stem (e.g. գնում → գնց- "go") and past/aorist stem (e.g. գնաց-). Note which stem a finite form is built from when relevant.
- Person/number endings on finite verbs. Present indicative copula: եմ/ես/է/ենք/եք/են. Imperfect: էի/էիր/էր/էինք/էիք/էին. Aorist endings: -ա/-եր/-եր/-անք/-աք/-ան. Note the ending on finite forms.
- Negation: չ- proclitic on indicative verbs (գիտեմ "I know" → չգիտեմ "I don't know"); մ- proclitic on subjunctive/conditional/imperative. Note it as a particle when relevant.
- Definite article: suffix -ը (գիրք "book" → գիրքը "the book"), with -ն before vowels/stops (գիրքն ու ...). Indefinite article is մի. Never label the article as a separate word; it is an enclitic suffix.
- Plural suffixes: -ներ (-ner) for most nouns; -եր (-er) for certain consonant-final stems and a closed class. Note which when relevant.
- Prepositions govern specific cases: ի + dative/accusative (motion), իր + genitive (location), ի վրա + genitive ("on"), ի մէջ + genitive ("among"). Note the governed case.
- Armenian has NO ezâfe (unlike Persian). Possession and noun-adjective links are via the genitive case suffix or the գ of possession — never an unwritten -e/-ye connector.
- Compound verbs: Armenian has many noun + անել/լինել/տալ compounds (e.g. ուսանել "to study", աշխատել "to work"). Note when a realization is a compound verb.
- Eastern Armenian is the standard (Republic of Armenia). Western Armenian (diaspora) differs in consonant voicing (Eastern տ=/t/ vs Western տ=/d/) and some lexical choices. Note the dialect only when it matters; default to Eastern.
- Reformed orthography (1922 Soviet, used in Republic of Armenia) vs Classical orthography (diaspora): the differences are systematic (e.g. Reformed երկիր vs Classical երկիր — same word, different suffix vowels in some positions). Pick one orthography per realization; do not mix within a single form.`,
    // Constructed (not observed) for the initial hy hardening pass — mirror
    // the over-suffixation failure class also enforced deterministically by
    // orthography constraints 3 and 4. Real Armenian infinitives end in
    // single -ել/-ալ (լինել, գնալ) and present participles in single -ում
    // (գնում). Revise against observed failures after the first hy runs.
    inventedWordAntiExamples: ['լինելել', 'գնումմ'],
    stage3OrthographyAntiPattern:
      '- For Armenian sourceText: do NOT use Cyrillic letters (Russian text bleed) — Armenian uses its own script (watch for visual confusables Russian а vs Armenian ա, Russian е vs Armenian ե, Russian о vs Armenian ո). Do NOT use Armenian modifier letters U+0559-U+055C (academic/liturgical only). Do NOT double the infinitive suffix (լինելել WRONG; լինել RIGHT). Do NOT double the մ of -ում (գնումմ WRONG; գնում RIGHT).',
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "ես", "transliteration": "es", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, nominative, Eastern Armenian", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "լինել", "transliteration": "linel", "gloss": "to be / to exist (copula)", "grammaticalNote": "verb, infinitive", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "չ", "transliteration": "ch", "gloss": "not (verbal negation particle)", "grammaticalNote": "proclitic on verbs: գիտեմ → չգիտեմ (I know → I don't know)", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Ես գնում եմ տուն։", "transliteration": "Es gnum em tun.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "Երևանում կա մետրո։", "transliteration": "Yerevanum ka metro.", "translation": "There is a metro in Yerevan." }
{ "coreConceptCode": "NEGATION", "sourceText": "Ես չգիտեմ։", "transliteration": "Es chgitem.", "translation": "I don't know." }`,
  },
  'sr-cyrl': {
    langName: 'Serbian',
    scriptLabel: 'Serbian Cyrillic',
    translitRequired: true,
    translitRuleText:
      '* REQUIRED for Serbian (use Gaj Latinica, the 1:1 bijection with the 30 Serbian Cyrillic letters: а→a, б→b, в→v, г→g, д→d, ђ→đ, е→e, ж→ž, з→z, и→i, ј→j, к→k, л→l, љ→lj, м→m, н→n, њ→nj, о→o, п→p, р→r, с→s, т→t, ћ→ć, у→u, ф→f, х→h, ц→c, ч→č, џ→dž, ш→š. Examples: ја→ja, бити→biti, не→ne, љубав→ljubav, ћирилица→ćirilica, књига→knjiga).',
    translitAntiPatternNote:
      '- For Serbian, leaving transliteration null/empty (it is REQUIRED).',
    grammarGuidance: BCS_GRAMMAR_GUIDANCE,
    inventedWordAntiExamples: BCS_INVENTED_WORD_ANTI_EXAMPLES,
    stage3OrthographyAntiPattern:
      '- For Serbian sourceText: do NOT use Russian-only Cyrillic letters (Ё/ё Ъ/ъ Ы/ы Э/э — U+0401/0451/042A/044A/042B/044B/042D/044D — Serbian Cyrillic has 30 letters, not the Russian 33). Do NOT use Ukrainian-only Cyrillic letters (Є/є І/і Ї/ї Ґ/ґ). Do NOT use Belarusian-only (Ў/ў). Do NOT double the infinitive suffix (битити WRONG; бити RIGHT).',
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "ја", "transliteration": "ja", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, nominative", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "бити", "transliteration": "biti", "gloss": "to be (copula)", "grammaticalNote": "verb, infinitive; also used as auxiliary", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "не", "transliteration": "ne", "gloss": "not (general negation)", "grammaticalNote": "negation particle, proclitic; negated verb forms written as one word (не знам → незнам also valid)", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Ја идем кући.", "transliteration": "Ja idem kući.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "У граду постоји парк.", "transliteration": "U gradu postoji park.", "translation": "There is a park in the city." }
{ "coreConceptCode": "NEGATION", "sourceText": "Ја не знам.", "transliteration": "Ja ne znam.", "translation": "I don't know." }`,
  },
  'bs-latn': {
    langName: 'Bosnian/Croatian',
    scriptLabel: "Latin (Gaj's orthography: č, ć, đ, š, ž, dž, lj, nj)",
    translitRequired: false,
    translitRuleText:
      "* OPTIONAL for Bosnian/Croatian (Latin script — romanization is trivially the surface form itself; you may omit this field for bs-latn).",
    translitAntiPatternNote:
      '- For Bosnian/Croatian, omitting transliteration is fine (Latin script).',
    grammarGuidance: BCS_GRAMMAR_GUIDANCE,
    inventedWordAntiExamples: BCS_INVENTED_WORD_ANTI_EXAMPLES,
    stage3OrthographyAntiPattern:
      "- For Bosnian/Croatian sourceText: do NOT use Cyrillic letters (U+0400-U+04FF — bs-latn uses Gaj's Latin orthography, not Cyrillic). Do NOT use Greek letters (U+0370-U+03FF). Do NOT double the infinitive suffix (bititi WRONG; biti RIGHT).",
    fewShotRealizations: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "ja", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, nominative", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "biti", "gloss": "to be (copula)", "grammaticalNote": "verb, infinitive; also used as auxiliary", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "ne", "gloss": "not (general negation)", "grammaticalNote": "negation particle, proclitic; negated verb forms written as one word (ne znam → neznam also valid)", "senseKind": "core" }`,
    fewShotSentences: `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Ja idem kući.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "U gradu postoji park.", "translation": "There is a park in the city." }
{ "coreConceptCode": "NEGATION", "sourceText": "Ja ne znam.", "translation": "I don't know." }`,
  },
};

/**
 * DB-level realization_type enum (migration 00003). The stage-2 prompt emits
 * these values DIRECTLY — no linguistic vocabulary, no normalization step.
 * Keep this list in lockstep with the Studio vendored copy in
 * `knowalong-studio/lib/concepts.ts` REALIZATION_TYPE_DB_ENUM.
 */
export const REALIZATION_TYPE_DB_VALUES = [
  'word',
  'phrase',
  'construction',
  'feature',
  'morpheme',
] as const;

// Stage 1: language profile
export function stage1LanguageProfilePrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Profile the ${input.targetLanguageCode} language for realization of these Core Concepts: ${input.coreConceptCodes.join(', ')}.
Existing realizations to avoid: ${(input.existingRealizationSurfaceForms ?? []).join(', ') || '(none)'}

Return JSON: { "profile": { "languageFamily": string, "typologicalFeatures": string[], "notes": string|null } }`,
    format: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            languageFamily: { type: 'string' },
            typologicalFeatures: { type: 'array', items: { type: 'string' } },
            notes: { type: ['string', 'null'] },
          },
          required: ['languageFamily', 'typologicalFeatures', 'notes'],
        },
      },
      required: ['profile'],
    },
  };
}

/**
 * Render the concept list for the prompt. When `coreConcepts` metadata is
 * supplied, each code is followed by its label + description so the model
 * has human-readable context. Otherwise codes are listed bare (legacy mode).
 */
function renderConceptList(input: ClccPromptInput): string {
  const meta = new Map((input.coreConcepts ?? []).map((c) => [c.code, c]));
  return input.coreConceptCodes
    .map((code) => {
      const m = meta.get(code);
      if (!m) return code;
      const bits = [`${code} — ${m.canonicalLabel}`];
      if (m.description) bits.push(m.description);
      if (m.functionalCluster || typeof m.tier === 'number') {
        const tail = [
          m.functionalCluster ? `cluster: ${m.functionalCluster}` : null,
          typeof m.tier === 'number' ? `tier: ${m.tier}` : null,
        ].filter(Boolean).join(', ');
        if (tail) bits.push(`(${tail})`);
      }
      return bits.join(' — ');
    })
    .join('\n');
}

/**
 * Per-language few-shot examples for stage 2. Anchoring the model on two
 * or three correct examples dramatically reduces hallucinated surface forms
 * on small local models. Examples use the DB enum directly.
 *
 * Data lives in `LANG_PROMPT_DATA` so the prompt layer is language-agnostic.
 */
function fewShotExamples(targetLanguageCode: ClccPromptInput['targetLanguageCode']): string {
  return LANG_PROMPT_DATA[targetLanguageCode].fewShotRealizations;
}

/**
 * Render the prior-attempt feedback block for a Stage 2 retry. Returns '' on a
 * first attempt (no priorRejections); returns a structured block listing each
 * rejected code with its rejection code + reason on a retry. The rejection-code
 * bracket is the language-general handle — any future profile's rejections
 * render identically, so no per-language retry text lives here.
 */
function renderPriorRejectionsBlock(input: ClccPromptInput): string {
  if (!input.priorRejections || input.priorRejections.length === 0) return '';
  const lines = input.priorRejections.map(
    (r) => `- ${r.coreConceptCode} [${r.rejectionCode}]: ${r.reason}`,
  );
  return `Prior attempt feedback (for retries only):
Your previous response for the following codes was rejected by deterministic validation. Each entry shows the rejection code and reason. Regenerate a valid realization for each code that avoids this exact error class.
${lines.join('\n')}`;
}

// Stage 2: per-concept realization proposals (load-bearing prompt).
//
// Design notes for small-local-model friendliness:
// - The DB enum is named explicitly and the prompt forbids other values.
// - Concept codes are listed WITH labels + descriptions when supplied, so
//   the model does not have to guess what opaque codes like `LIKE_PREFER`
//   or `LOCATE_ON` mean.
// - Few-shot examples anchor the expected shape.
// - gloss is required and MUST be a non-empty English translation of the
//   surface form (small models emit null when allowed).
// - The anti-pattern callout forbids English-word-plus-target-suffix jams
//   (the "likedat"/"needat" failure mode llama3.2:3b produced before).
export function stage2RealizationsPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  const langData = LANG_PROMPT_DATA[input.targetLanguageCode];
  const langName = langData.langName;
  const conceptList = renderConceptList(input);
  const examples = fewShotExamples(input.targetLanguageCode);
  const priorFeedbackBlock = renderPriorRejectionsBlock(input);

  const prompt = `You are a linguist seeding a Core-Concept language pack for ${langName} (${input.targetLanguageCode}).
For EACH Core Concept below, propose exactly one ${langName} realization.

Concepts to realize:
${conceptList}

Return STRICT JSON with this shape:
{ "realizations": [
  { "coreConceptCode": string,
    "realizationType": "word" | "phrase" | "construction" | "feature" | "morpheme",
    "surfaceForm": string,
    "transliteration": string,
    "gloss": string,
    "grammaticalNote": string,
    "senseKind": "core" | "contextual" | "idiomatic" }
] }

Field rules (NON-NEGOTIABLE):
- "coreConceptCode": MUST be one of the codes listed above. One entry per code, no duplicates, no extras.
- "realizationType": MUST be one of: word, phrase, construction, feature, morpheme.
    * word = a single ${langName} word (the common case for lexical concepts).
    * phrase = a fixed multi-word expression (e.g. "il y a" in French).
    * construction = a grammatical pattern requiring multiple slots (e.g. "ne... pas").
    * feature = an inflectional or morphological feature realized on another word.
    * morpheme = a bound morpheme or particle that cannot stand alone (e.g. Russian "не").
- "surfaceForm": the actual ${langName} text. MUST be a real ${langName} word/phrase that a native speaker would recognize.
- "transliteration": the surface form romanized into the Latin script using the canonical scheme for ${langName}.
    ${langData.translitRuleText}
    * This is transliteration ONLY — NOT IPA, NOT stress marks, NOT pronunciation guidance. Just the romanized form of "surfaceForm".
- "gloss": a SHORT English translation of surfaceForm. REQUIRED — never null, never empty. Examples: "I (1sg pronoun)", "to be", "not (negation particle)".
- "grammaticalNote": one short note on part of speech + notable grammar. REQUIRED — never null, never empty. Call out: part of speech, aspect/case/gender where relevant, register if unusual.
${langData.grammarGuidance ? langData.grammarGuidance + '\n' : ''}- "senseKind": "core" for the canonical mapping (almost always "core" for this task).

${examples}

Anti-patterns (NEVER produce these):
- Made-up words formed by gluing an English stem to a ${langName} suffix (e.g. "likedat", "needat"). If you are not sure of the real ${langName} word for a concept, output your best-guess REAL ${langName} word and put a clear note in grammaticalNote; never invent a hybrid.
- Surrogate code in surfaceForm (e.g. "TODO", "—", "?", the concept code itself).
- Leaving gloss or grammaticalNote null/empty.
${langData.translitAntiPatternNote}
- Putting IPA, stress marks, syllable boundaries, or audio hints in transliteration. Transliteration is the romanized form only.
- Setting realizationType to anything outside the five allowed values (no "lexical", "periphrastic", "morphological", "syntactic").
${priorFeedbackBlock ? priorFeedbackBlock + '\n' : ''}
Return ONLY the JSON object. No prose, no markdown fences.`;

  const realizationItemSchema = {
    type: 'object',
    properties: {
      coreConceptCode: { type: 'string' },
      realizationType: { type: 'string', enum: [...REALIZATION_TYPE_DB_VALUES] },
      surfaceForm: { type: 'string', minLength: 1 },
      transliteration: { type: 'string', minLength: 1 },
      gloss: { type: 'string', minLength: 1 },
      grammaticalNote: { type: 'string', minLength: 1 },
      senseKind: { type: 'string', enum: ['core', 'contextual', 'idiomatic'] },
    },
    required: [
      'coreConceptCode',
      'realizationType',
      'surfaceForm',
      'gloss',
      'grammaticalNote',
      'senseKind',
      ...(langData.translitRequired ? ['transliteration'] : []),
    ],
  };

  return {
    prompt,
    format: {
      type: 'object',
      properties: {
        realizations: {
          type: 'array',
          items: realizationItemSchema,
        },
      },
      required: ['realizations'],
    },
  };
}

// Stage 3: example sentences
//
// Rewritten for small-local-model reliability (mirrors Stage 2 discipline):
//  - Language code is resolved to a human-readable language name in the prompt.
//  - Per-language 3-shot anchors (FIRST_PERSON / EXIST / NEGATION — the same
//    shape anchors Stage 2 uses) show the expected JSON shape.
//  - Concept codes are listed WITH labels + descriptions when supplied.
//  - Stage-2 realizations (when supplied) are surfaced as the word/phrase the
//    sentence should illustrate, so the model is anchored on a real surface
//    form rather than left to invent one.
//  - Explicit anti-hallucination callouts forbid invented words, mixed-script
//    sentences, fake cognates, and transliteration when the language has its
//    own script.
//  - "Short, simple, idiomatic, high-frequency" is the production rule.
export function stage3ExamplesPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  const langData = LANG_PROMPT_DATA[input.targetLanguageCode];
  const langName = langData.langName;
  const langCode = input.targetLanguageCode;
  const scriptLabel = langData.scriptLabel;
  const conceptList = renderConceptListForExamples(input);
  const examples = fewShotExampleSentences(langCode);

  const prompt = `You are a linguist writing example sentences for a Core-Concept language pack for ${langName} (${langCode}).
For EACH Core Concept below, write ONE short ${langName} sentence that illustrates the concept, using its realization when one is provided.

Concepts to illustrate:
${conceptList}

Return STRICT JSON with this shape:
{ "examples": [
  { "coreConceptCode": string,
    "sourceText": string,
    "transliteration": string,
    "translation": string }
] }

Field rules (NON-NEGOTIABLE):
- "coreConceptCode": MUST be one of the codes listed above. One entry per code, no duplicates, no extras.
- "sourceText": ONE ${langName} sentence that a native speaker would actually say.
    * Short and simple: one clause, 3-10 words, everyday vocabulary.
    * MUST be written in ${langName} script (${scriptLabel}). Do NOT transliterate.
    * Avoid proper nouns (people, brands, place names) unless extremely common.
    * Avoid literary, archaic, or rare vocabulary. Prefer words a beginner would recognize.
    * When a realization is provided for the concept, the sentence should ideally contain that surface form.
- "transliteration": the sourceText romanized into the Latin script using the canonical scheme for ${langName}.
    ${langData.translitRuleText}
    * This is transliteration ONLY — NOT IPA, NOT stress marks, NOT pronunciation guidance. Just the romanized form of "sourceText".
- "translation": a natural English translation of sourceText. REQUIRED — never null, never empty. MUST match the meaning of sourceText.

${examples}

Anti-patterns (NEVER produce these):
${langData.inventedWordAntiExamples && langData.inventedWordAntiExamples.length > 0
  ? `- Invented or fabricated ${langName} words (e.g. ${langData.inventedWordAntiExamples.map((w) => `"${w}"`).join(', ')} are NOT real ${langName}). If you are unsure of a word, write a SIMPLER real sentence using vocabulary you do know.`
  : '- Invented or fabricated ' + langName + ' words are NOT acceptable. If you are unsure of a word, write a SIMPLER real sentence using vocabulary you do know.'}
- Mixed-script sentences (English words glued into ${langName} grammar, e.g. "I am не going").
- Transliterated ${langName} written in Latin script when ${langName} has its own script — keep sourceText in the native script; the Latin form goes in "transliteration", never in "sourceText".
- Fake cognates or "sounds-plausible" phonotactic nonsense that is not a real word.
${langData.stage3OrthographyAntiPattern ? langData.stage3OrthographyAntiPattern + '\n' : ''}${langData.translitAntiPatternNote}
- Putting IPA, stress marks, syllable boundaries, or audio hints in transliteration.
- Long multi-clause sentences; complex or literary vocabulary.
- Translation that does not match sourceText.

Return ONLY the JSON object. No prose, no markdown fences.`;

  const exampleItemSchema = {
    type: 'object',
    properties: {
      coreConceptCode: { type: 'string' },
      sourceText: { type: 'string', minLength: 2 },
      transliteration: { type: 'string', minLength: 2 },
      translation: { type: 'string', minLength: 2 },
    },
    required: [
      'coreConceptCode',
      'sourceText',
      'translation',
      ...(langData.translitRequired ? ['transliteration'] : []),
    ],
  };

  return {
    prompt,
    format: {
      type: 'object',
      properties: {
        examples: {
          type: 'array',
          items: exampleItemSchema,
        },
      },
      required: ['examples'],
    },
  };
}

/**
 * Render the concept list for the stage-3 prompt. Each line shows the code,
 * its label + description (when supplied), AND the realization surface form
 * (when supplied) so the model knows what word to use in the sentence.
 */
function renderConceptListForExamples(input: ClccPromptInput): string {
  const meta = new Map((input.coreConcepts ?? []).map((c) => [c.code, c]));
  const realByCode = new Map((input.realizations ?? []).map((r) => [r.coreConceptCode, r.surfaceForm]));
  return input.coreConceptCodes
    .map((code) => {
      const m = meta.get(code);
      const bits = [code];
      if (m) {
        bits.push(m.canonicalLabel);
        if (m.description) bits.push(`(${m.description})`);
      }
      const surfaceForm = realByCode.get(code);
      if (surfaceForm) bits.push(`[realization: ${surfaceForm}]`);
      return bits.join(' — ');
    })
    .join('\n');
}

/**
 * Per-language 3-shot anchors for stage-3 example sentences. Same anchor
 * concepts Stage 2 uses (FIRST_PERSON / EXIST / NEGATION); only the shape
 * differs (sourceText + translation instead of surfaceForm + gloss).
 *
 * Data lives in `LANG_PROMPT_DATA` so the prompt layer is language-agnostic.
 */
function fewShotExampleSentences(targetLanguageCode: ClccPromptInput['targetLanguageCode']): string {
  return LANG_PROMPT_DATA[targetLanguageCode].fewShotSentences;
}

// Stage 4: validation + cross-check
export function stage4ValidationPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Cross-check that every requested Core Concept has a realization in ${input.targetLanguageCode}.
Concepts requested: ${input.coreConceptCodes.join(', ')}

Return JSON: { "missing": [{ "coreConceptCode": string, "reason": string }], "lowConfidence": [{ "coreConceptCode": string, "reason": string }] }`,
    format: {
      type: 'object',
      properties: {
        missing: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              coreConceptCode: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['coreConceptCode', 'reason'],
          },
        },
        lowConfidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              coreConceptCode: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['coreConceptCode', 'reason'],
          },
        },
      },
      required: ['missing', 'lowConfidence'],
    },
  };
}

// Stage 5: summary
export function stage5SummaryPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Summarize the ${input.targetLanguageCode} CLCC generation for these concepts: ${input.coreConceptCodes.join(', ')}.
Return JSON: { "summary": { "conceptCount": number, "realizationCount": number, "notes": string|null } }`,
    format: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            conceptCount: { type: 'integer' },
            realizationCount: { type: 'integer' },
            notes: { type: ['string', 'null'] },
          },
          required: ['conceptCount', 'realizationCount', 'notes'],
        },
      },
      required: ['summary'],
    },
  };
}

export const CLCC_STAGES = [
  { id: 'profile', label: 'Language profile' },
  { id: 'realizations', label: 'Realization proposals' },
  { id: 'examples', label: 'Example sentences' },
  { id: 'validation', label: 'Cross-check + validation' },
  { id: 'summary', label: 'Summary' },
] as const;
