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

export interface ClccPromptInput {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
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
 * Transliteration is included for ru (ISO 9 — the load-bearing Phase-1 case)
 * and fa (BGN/PCGN-style romanization — Persian is non-Latin too). Omitted
 * for fr (Latin script — romanization is trivially the surface form itself).
 */
function fewShotExamples(targetLanguageCode: ClccPromptInput['targetLanguageCode']): string {
  if (targetLanguageCode === 'ru') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "я", "transliteration": "ya", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, nominative case, singular", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "быть", "transliteration": "byt'", "gloss": "to be (existential copula)", "grammaticalNote": "verb, infinitive, imperfective aspect", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "не", "transliteration": "ne", "gloss": "not (general negation)", "grammaticalNote": "negation particle, proclitic, unstressed", "senseKind": "core" }`;
  }
  if (targetLanguageCode === 'fr') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "je", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "subject pronoun, singular; elides to j' before a vowel", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "construction", "surfaceForm": "il y a", "gloss": "there is / there are (existential)", "grammaticalNote": "impersonal construction; invariant for number", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "construction", "surfaceForm": "ne... pas", "gloss": "not (general negation)", "grammaticalNote": "two-part negation: ne before verb, pas after", "senseKind": "core" }`;
  }
  // fa
  return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "من", "transliteration": "man", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, Persian-Arabic script", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "بودن", "transliteration": "budan", "gloss": "to be / to exist (copula)", "grammaticalNote": "verb, infinitive; present-tense copula is often omitted", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "ن", "transliteration": "na", "gloss": "not (verbal negation prefix)", "grammaticalNote": "proclitic/prefix on verbs: می‌روم → نمی‌روم", "senseKind": "core" }`;
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
  const langName =
    input.targetLanguageCode === 'ru' ? 'Russian' :
    input.targetLanguageCode === 'fr' ? 'French' :
    'Persian/Farsi';
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
    * REQUIRED for Russian (use ISO 9: я→ya, быть→byt', не→ne, ё→ё→e/yo, ж→zh, ш→sh, щ→shch, ц→ts, ч→ch, ы→y, й→y, ю→yu, я→ya, ъ→', ь→').
    * REQUIRED for Persian (use BGN/PCGN: من→man, بودن→budan, ن→na/na-).
    * OPTIONAL for French (Latin script — romanization is trivially the surface form itself; you may omit this field for fr).
    * This is transliteration ONLY — NOT IPA, NOT stress marks, NOT pronunciation guidance. Just the romanized form of "surfaceForm".
- "gloss": a SHORT English translation of surfaceForm. REQUIRED — never null, never empty. Examples: "I (1sg pronoun)", "to be", "not (negation particle)".
- "grammaticalNote": one short note on part of speech + notable grammar. REQUIRED — never null, never empty. Call out: part of speech, aspect/case/gender where relevant, register if unusual.
- "senseKind": "core" for the canonical mapping (almost always "core" for this task).

${examples}

Anti-patterns (NEVER produce these):
- Made-up words formed by gluing an English stem to a ${langName} suffix (e.g. "likedat", "needat"). If you are not sure of the real ${langName} word for a concept, output your best-guess REAL ${langName} word and put a clear note in grammaticalNote; never invent a hybrid.
- Surrogate code in surfaceForm (e.g. "TODO", "—", "?", the concept code itself).
- Leaving gloss or grammaticalNote null/empty.
- For ru/fa, leaving transliteration null/empty. For fr, omitting transliteration is fine.
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
      ...(input.targetLanguageCode === 'ru' || input.targetLanguageCode === 'fa' ? ['transliteration'] : []),
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
  const langName =
    input.targetLanguageCode === 'ru' ? 'Russian' :
    input.targetLanguageCode === 'fr' ? 'French' :
    'Persian/Farsi';
  const langCode = input.targetLanguageCode;
  const scriptLabel =
    langCode === 'ru' ? 'Cyrillic' :
    langCode === 'fr' ? 'Latin (with diacritics)' :
    'Persian-Arabic';
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
    * REQUIRED for Russian (use ISO 9: я→ya, быть→byt', не→ne, Москва→Moskva).
    * REQUIRED for Persian (use BGN/PCGN).
    * OPTIONAL for French (Latin script — romanization is trivially sourceText itself; you may omit this field for fr).
    * This is transliteration ONLY — NOT IPA, NOT stress marks, NOT pronunciation guidance. Just the romanized form of "sourceText".
- "translation": a natural English translation of sourceText. REQUIRED — never null, never empty. MUST match the meaning of sourceText.

${examples}

Anti-patterns (NEVER produce these):
- Invented or fabricated ${langName} words (e.g. "валяя", "деляю" are NOT real Russian). If you are unsure of a word, write a SIMPLER real sentence using vocabulary you do know.
- Mixed-script sentences (English words glued into ${langName} grammar, e.g. "I am не going").
- Transliterated ${langName} written in Latin script when ${langName} has its own script — keep sourceText in the native script; the Latin form goes in "transliteration", never in "sourceText".
- Fake cognates or "sounds-plausible" phonotactic nonsense that is not a real word.
- For ru/fa, leaving transliteration null/empty. For fr, omitting transliteration is fine.
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
      ...(input.targetLanguageCode === 'ru' || input.targetLanguageCode === 'fa' ? ['transliteration'] : []),
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
 * Transliteration rides along for ru (ISO 9) and fa (BGN/PCGN); omitted
 * for fr (Latin script — romanization is trivially sourceText itself).
 */
function fewShotExampleSentences(targetLanguageCode: ClccPromptInput['targetLanguageCode']): string {
  if (targetLanguageCode === 'ru') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Я иду домой.", "transliteration": "Ya idu domoy.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "В Москве есть метро.", "transliteration": "V Moskve yest' metro.", "translation": "There is a metro in Moscow." }
{ "coreConceptCode": "NEGATION", "sourceText": "Я не знаю.", "transliteration": "Ya ne znayu.", "translation": "I don't know." }`;
  }
  if (targetLanguageCode === 'fr') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "Je vais à la maison.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "Il y a un livre sur la table.", "translation": "There is a book on the table." }
{ "coreConceptCode": "NEGATION", "sourceText": "Je ne sais pas.", "translation": "I don't know." }`;
  }
  // fa
  return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "sourceText": "من می‌روم خانه.", "transliteration": "Man miram khaneh.", "translation": "I am going home." }
{ "coreConceptCode": "EXIST", "sourceText": "در تهران مترو هست.", "transliteration": "Dar Tehran metro hast.", "translation": "There is a metro in Tehran." }
{ "coreConceptCode": "NEGATION", "sourceText": "من نمی‌دانم.", "transliteration": "Man nemidanam.", "translation": "I don't know." }`;
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
