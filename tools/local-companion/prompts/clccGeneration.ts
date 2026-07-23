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

export interface ClccPromptInput {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  /** Optional catalog metadata; when supplied, the stage-2 prompt embeds it. */
  coreConcepts?: CompanionClccConceptInput[];
  existingRealizationSurfaceForms?: string[];
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
 */
function fewShotExamples(targetLanguageCode: ClccPromptInput['targetLanguageCode']): string {
  if (targetLanguageCode === 'ru') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "я", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, nominative case, singular", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "быть", "gloss": "to be (existential copula)", "grammaticalNote": "verb, infinitive, imperfective aspect", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "не", "gloss": "not (general negation)", "grammaticalNote": "negation particle, proclitic, unstressed", "senseKind": "core" }`;
  }
  if (targetLanguageCode === 'fr') {
    return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "je", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "subject pronoun, singular; elides to j' before a vowel", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "construction", "surfaceForm": "il y a", "gloss": "there is / there are (existential)", "grammaticalNote": "impersonal construction; invariant for number", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "construction", "surfaceForm": "ne... pas", "gloss": "not (general negation)", "grammaticalNote": "two-part negation: ne before verb, pas after", "senseKind": "core" }`;
  }
  // fa
  return `Examples of well-formed entries (do NOT copy these concepts — only use them as shape reference):
{ "coreConceptCode": "FIRST_PERSON", "realizationType": "word", "surfaceForm": "من", "gloss": "I (first-person singular pronoun)", "grammaticalNote": "personal pronoun, singular, Persian-Arabic script", "senseKind": "core" }
{ "coreConceptCode": "EXIST", "realizationType": "word", "surfaceForm": "بودن", "gloss": "to be / to exist (copula)", "grammaticalNote": "verb, infinitive; present-tense copula is often omitted", "senseKind": "core" }
{ "coreConceptCode": "NEGATION", "realizationType": "morpheme", "surfaceForm": "ن", "gloss": "not (verbal negation prefix)", "grammaticalNote": "proclitic/prefix on verbs: می‌روم → نمی‌روم", "senseKind": "core" }`;
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

  const prompt = `You are a linguist seeding a Core-Concept language pack for ${langName} (${input.targetLanguageCode}).
For EACH Core Concept below, propose exactly one ${langName} realization.

Concepts to realize:
${conceptList}

Return STRICT JSON with this shape:
{ "realizations": [
  { "coreConceptCode": string,
    "realizationType": "word" | "phrase" | "construction" | "feature" | "morpheme",
    "surfaceForm": string,
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
- "gloss": a SHORT English translation of surfaceForm. REQUIRED — never null, never empty. Examples: "I (1sg pronoun)", "to be", "not (negation particle)".
- "grammaticalNote": one short note on part of speech + notable grammar. REQUIRED — never null, never empty. Call out: part of speech, aspect/case/gender where relevant, register if unusual.
- "senseKind": "core" for the canonical mapping (almost always "core" for this task).

${examples}

Anti-patterns (NEVER produce these):
- Made-up words formed by gluing an English stem to a ${langName} suffix (e.g. "likedat", "needat"). If you are not sure of the real ${langName} word for a concept, output your best-guess REAL ${langName} word and put a clear note in grammaticalNote; never invent a hybrid.
- Surrogate code in surfaceForm (e.g. "TODO", "—", "?", the concept code itself).
- Leaving gloss or grammaticalNote null/empty.
- Setting realizationType to anything outside the five allowed values (no "lexical", "periphrastic", "morphological", "syntactic").

Return ONLY the JSON object. No prose, no markdown fences.`;

  const realizationItemSchema = {
    type: 'object',
    properties: {
      coreConceptCode: { type: 'string' },
      realizationType: { type: 'string', enum: [...REALIZATION_TYPE_DB_VALUES] },
      surfaceForm: { type: 'string', minLength: 1 },
      gloss: { type: 'string', minLength: 1 },
      grammaticalNote: { type: 'string', minLength: 1 },
      senseKind: { type: 'string', enum: ['core', 'contextual', 'idiomatic'] },
    },
    required: ['coreConceptCode', 'realizationType', 'surfaceForm', 'gloss', 'grammaticalNote', 'senseKind'],
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
export function stage3ExamplesPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Generate one short example ${input.targetLanguageCode} sentence illustrating each Core Concept: ${input.coreConceptCodes.join(', ')}.
Return JSON: { "examples": [{ "coreConceptCode": string, "sourceText": string, "translation": string }] }`,
    format: {
      type: 'object',
      properties: {
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              coreConceptCode: { type: 'string' },
              sourceText: { type: 'string' },
              translation: { type: 'string' },
            },
            required: ['coreConceptCode', 'sourceText', 'translation'],
          },
        },
      },
      required: ['examples'],
    },
  };
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
