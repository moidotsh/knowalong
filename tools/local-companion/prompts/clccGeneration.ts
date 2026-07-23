// tools/local-companion/prompts/clccGeneration.ts
// 5-stage CLCC generation prompts. Each concept in the request body is
// realized into the target language. CLCC promotion into concept_realizations
// is DEFERRED for this checkpoint — these prompts produce realization
// proposals only (reviewable / editable / rejectable / exportable).

export interface ClccPromptInput {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  existingRealizationSurfaceForms?: string[];
}

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

// Stage 2: per-concept realization proposals
export function stage2RealizationsPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `For each Core Concept code, propose a ${input.targetLanguageCode} realization.
Concepts: ${input.coreConceptCodes.join(', ')}

Return JSON: { "realizations": [{ "coreConceptCode": string, "realizationType": "lexical"|"periphrastic"|"morphological"|"syntactic", "surfaceForm": string, "gloss": string|null, "grammaticalNote": string|null, "senseKind": "core"|"contextual"|"idiomatic" }] }
- surfaceForm is the ${input.targetLanguageCode} word/phrase.
- realizationType captures HOW the concept is expressed.
- senseKind is "core" for canonical mappings.`,
    format: {
      type: 'object',
      properties: {
        realizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              coreConceptCode: { type: 'string' },
              realizationType: { type: 'string', enum: ['lexical', 'periphrastic', 'morphological', 'syntactic'] },
              surfaceForm: { type: 'string' },
              gloss: { type: ['string', 'null'] },
              grammaticalNote: { type: ['string', 'null'] },
              senseKind: { type: 'string', enum: ['core', 'contextual', 'idiomatic'] },
            },
            required: ['coreConceptCode', 'realizationType', 'surfaceForm', 'gloss', 'grammaticalNote', 'senseKind'],
          },
        },
      },
      required: ['realizations'],
    },
  };
}

// Stage 3: example sentences
export function stage3ExamplesPrompt(input: ClccPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Generate example ${input.targetLanguageCode} sentences for each Core Concept: ${input.coreConceptCodes.join(', ')}.
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
