// tools/local-companion/prompts/sourceAnalysis.ts
// JSON-schema-constrained prompts for the 9-stage source-analysis pipeline.
// Source-text-slice-only — never instruct code/file/URL access. Each prompt
// receives ONLY the relevant slice of source text needed for its stage.

export interface SourceLine {
  ordinal: number;
  rawText: string;
  sectionLabel?: string | null;
}

export interface SourceAnalysisPromptInput {
  targetLanguageCode: string;
  translationLanguageCode: string;
  sourceLines: SourceLine[];
}

// Stage 1: section segmentation
export function stage1SectionsPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `You are a linguist analyzing ${input.targetLanguageCode} song lyrics for a language learner.
Below are ${input.sourceLines.length} lines (ordinal: text). Group them into sections (verse, chorus, bridge, intro, outro, stanza, section).

Lines (ordinal | sectionLabel | text):
${input.sourceLines.map((l) => `${l.ordinal} | ${l.sectionLabel ?? ''} | ${l.rawText}`).join('\n')}

Return JSON: { "sections": [{ "ordinal": number, "sectionType": "verse"|"chorus"|"bridge"|"intro"|"outro"|"stanza"|"section", "label": string|null, "lineOrdinals": number[] }] }
- lineOrdinals must reference actual line ordinals from the input.
- Sections must cover all lines without overlap.`,
    format: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ordinal: { type: 'integer' },
              sectionType: { type: 'string', enum: ['verse', 'chorus', 'bridge', 'intro', 'outro', 'stanza', 'section'] },
              label: { type: ['string', 'null'] },
              lineOrdinals: { type: 'array', items: { type: 'integer' } },
            },
            required: ['ordinal', 'sectionType', 'label', 'lineOrdinals'],
          },
        },
      },
      required: ['sections'],
    },
  };
}

// Stage 2: segment identification (sentence/clause/phrase/refrain_fragment)
export function stage2SegmentsPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Identify linguistic segments (sentences, clauses, phrases, refrain fragments) in these ${input.targetLanguageCode} lines.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "segments": [{ "ordinal": number, "segmentKind": "sentence"|"clause"|"phrase"|"refrain_fragment"|"annotation"|"other", "label": string|null, "lineSpan": [{ "sourceLineOrdinal": number, "ordinal": number, "startOffset": number|null, "endOffset": number|null, "lineFragment": string|null }] }] }
- offsets are character indices into the line's rawText.
- assembledDisplayText is the concatenation of lineFragments joined by \\n.`,
    format: {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ordinal: { type: 'integer' },
              segmentKind: { type: 'string', enum: ['sentence', 'clause', 'phrase', 'refrain_fragment', 'annotation', 'other'] },
              label: { type: ['string', 'null'] },
              lineSpan: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sourceLineOrdinal: { type: 'integer' },
                    ordinal: { type: 'integer' },
                    startOffset: { type: ['integer', 'null'] },
                    endOffset: { type: ['integer', 'null'] },
                    lineFragment: { type: ['string', 'null'] },
                  },
                  required: ['sourceLineOrdinal', 'ordinal', 'startOffset', 'endOffset', 'lineFragment'],
                },
              },
            },
            required: ['ordinal', 'segmentKind', 'label', 'lineSpan'],
          },
        },
      },
      required: ['segments'],
    },
  };
}

// Stage 3: line translation
export function stage3LineTranslationPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Translate each ${input.targetLanguageCode} line into ${input.translationLanguageCode}.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "translations": [{ "sourceLineOrdinal": number, "translationText": string }] }
- Translate idiomatically, not literally.
- Preserve the line's intent; do NOT transliterate.
- Match register (formal/casual).`,
    format: {
      type: 'object',
      properties: {
        translations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sourceLineOrdinal: { type: 'integer' },
              translationText: { type: 'string' },
            },
            required: ['sourceLineOrdinal', 'translationText'],
          },
        },
      },
      required: ['translations'],
    },
  };
}

// Stage 4: lemma extraction
export function stage4LemmasPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Identify the canonical lemmas of the content words in these ${input.targetLanguageCode} lines.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "lemmas": [{ "normalizedLemma": string, "partOfSpeech": string, "primaryGloss": string|null, "languageCode": "${input.targetLanguageCode}", "grammaticalGender": string|null, "animacy": string|null, "verbAspect": string|null }] }
- Only content words (nouns, verbs, adjectives, adverbs).
- normalizedLemma is the citation form.
- primaryGloss is a brief English gloss (or null if uncertain).`,
    format: {
      type: 'object',
      properties: {
        lemmas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              normalizedLemma: { type: 'string' },
              partOfSpeech: { type: 'string' },
              primaryGloss: { type: ['string', 'null'] },
              languageCode: { type: 'string' },
              grammaticalGender: { type: ['string', 'null'] },
              animacy: { type: ['string', 'null'] },
              verbAspect: { type: ['string', 'null'] },
            },
            required: ['normalizedLemma', 'partOfSpeech', 'primaryGloss', 'languageCode', 'grammaticalGender', 'animacy', 'verbAspect'],
          },
        },
      },
      required: ['lemmas'],
    },
  };
}

// Stage 5: form identification
export function stage5FormsPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `For each surface form in these ${input.targetLanguageCode} lines that inflects from a lemma, identify the form + morphology.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "forms": [{ "lemmaIndex": number, "surfaceForm": string, "morphologySummary": string, "grammaticalCase": string|null, "grammaticalNumber": string|null, "grammaticalPerson": string|null, "tense": string|null }] }
- lemmaIndex references into the lemma array from stage 4.
- morphologySummary is a brief structured description (e.g. "1st person singular present").`,
    format: {
      type: 'object',
      properties: {
        forms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lemmaIndex: { type: 'integer' },
              surfaceForm: { type: 'string' },
              morphologySummary: { type: 'string' },
              grammaticalCase: { type: ['string', 'null'] },
              grammaticalNumber: { type: ['string', 'null'] },
              grammaticalPerson: { type: ['string', 'null'] },
              tense: { type: ['string', 'null'] },
            },
            required: ['lemmaIndex', 'surfaceForm', 'morphologySummary', 'grammaticalCase', 'grammaticalNumber', 'grammaticalPerson', 'tense'],
          },
        },
      },
      required: ['forms'],
    },
  };
}

// Stage 6: token_occurrence identification
export function stage6TokensPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Tokenize these ${input.targetLanguageCode} lines. For each token, record its surface form + character offsets.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "tokens": [{ "lineOrdinal": number, "ordinal": number, "surfaceToken": string, "charStart": number|null, "charEnd": number|null, "lemmaIndex": number|null, "formIndex": number|null }] }
- charStart/charEnd are character offsets into the line's rawText.`,
    format: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lineOrdinal: { type: 'integer' },
              ordinal: { type: 'integer' },
              surfaceToken: { type: 'string' },
              charStart: { type: ['integer', 'null'] },
              charEnd: { type: ['integer', 'null'] },
              lemmaIndex: { type: ['integer', 'null'] },
              formIndex: { type: ['integer', 'null'] },
            },
            required: ['lineOrdinal', 'ordinal', 'surfaceToken', 'charStart', 'charEnd', 'lemmaIndex', 'formIndex'],
          },
        },
      },
      required: ['tokens'],
    },
  };
}

// Stage 7: morphology enrichment
export function stage7MorphologyPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `For each surface form in these ${input.targetLanguageCode} lines, provide a concise morphology summary if not already present.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "morphology": [{ "formIndex": number, "morphologySummary": string }] }
- formIndex references the form array from stage 5.
- morphologySummary is structured (case/number/person/tense as applicable).`,
    format: {
      type: 'object',
      properties: {
        morphology: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              formIndex: { type: 'integer' },
              morphologySummary: { type: 'string' },
            },
            required: ['formIndex', 'morphologySummary'],
          },
        },
      },
      required: ['morphology'],
    },
  };
}

// Stage 8: grammar_pattern + concept_mapping
export function stage8GrammarAndConceptsPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Identify grammatical patterns in these ${input.targetLanguageCode} lines and map lemmas to Core Concept codes (FIRST_PERSON, EXIST, WANT, PAST, NEGATION, …).
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "grammarPatterns": [{ "patternCode": string, "patternLabel": string, "explanation": string|null, "exampleSourceText": string|null, "exampleTargetText": string|null, "confidence": number|null, "targetCoreConceptCode": string|null, "targetLemmaIndex": number|null }], "conceptMappings": [{ "lemmaIndex": number, "coreConceptCode": string, "realizationNote": string|null, "confidence": number|null }] }
- Pattern codes are short stable identifiers (e.g. PAST_PERFECTIVE, NEGATIVE_PARTICLE).
- CoreConceptCodes must be from the seeded catalog (FIRST_PERSON, EXIST, WANT, …).`,
    format: {
      type: 'object',
      properties: {
        grammarPatterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              patternCode: { type: 'string' },
              patternLabel: { type: 'string' },
              explanation: { type: ['string', 'null'] },
              exampleSourceText: { type: ['string', 'null'] },
              exampleTargetText: { type: ['string', 'null'] },
              confidence: { type: ['number', 'null'] },
              targetCoreConceptCode: { type: ['string', 'null'] },
              targetLemmaIndex: { type: ['integer', 'null'] },
            },
            required: ['patternCode', 'patternLabel'],
          },
        },
        conceptMappings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lemmaIndex: { type: 'integer' },
              coreConceptCode: { type: 'string' },
              realizationNote: { type: ['string', 'null'] },
              confidence: { type: ['number', 'null'] },
            },
            required: ['lemmaIndex', 'coreConceptCode'],
          },
        },
      },
      required: ['grammarPatterns', 'conceptMappings'],
    },
  };
}

// Stage 9: card proposal synthesis
export function stage9CardsPrompt(input: SourceAnalysisPromptInput): { prompt: string; format: Record<string, unknown> } {
  return {
    prompt: `Propose source-derived study cards (recognition / production / cloze) from these ${input.targetLanguageCode} lines.
Lines (ordinal: text):
${input.sourceLines.map((l) => `${l.ordinal}: ${l.rawText}`).join('\n')}

Return JSON: { "cards": [{ "cardKind": "source_recognition"|"source_production"|"source_cloze", "sourceLineOrdinal": number, "prompt": string, "answer": string, "contextNote": string|null, "lemmaIndex": number|null }] }
- Source-derived cards must reference a real sourceLineOrdinal.
- Cloze cards should blank out the tested token with ___.
- Keep prompts concise.`,
    format: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cardKind: { type: 'string', enum: ['source_recognition', 'source_production', 'source_cloze'] },
              sourceLineOrdinal: { type: 'integer' },
              prompt: { type: 'string' },
              answer: { type: 'string' },
              contextNote: { type: ['string', 'null'] },
              lemmaIndex: { type: ['integer', 'null'] },
            },
            required: ['cardKind', 'sourceLineOrdinal', 'prompt', 'answer', 'contextNote', 'lemmaIndex'],
          },
        },
      },
      required: ['cards'],
    },
  };
}

export const SOURCE_ANALYSIS_STAGES = [
  { id: 'sections', label: 'Section segmentation' },
  { id: 'segments', label: 'Segment identification' },
  { id: 'translations', label: 'Line translation' },
  { id: 'lemmas', label: 'Lemma extraction' },
  { id: 'forms', label: 'Form identification' },
  { id: 'tokens', label: 'Token occurrence' },
  { id: 'morphology', label: 'Morphology enrichment' },
  { id: 'grammar_and_concepts', label: 'Grammar patterns + concept mapping' },
  { id: 'cards', label: 'Card synthesis' },
] as const;
