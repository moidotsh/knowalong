// shared/types/knowalong/schemas.ts
// Zod schemas for KnowAlong write paths. These are the wire-contract
// validators that repositories call via validateWithSchema before
// persisting. The TS types in dtos.ts/entities.ts are inferred from these
// schemas where practical; where a schema and a type disagree, the schema
// is the source of truth for the wire and the type is the source of truth
// for the domain.

import { z } from 'zod';

/** 100 KB cap on pasted text. Large enough for any reasonable song lyrics; small enough to keep analysis bounded. */
export const MAX_LYRIC_TEXT_BYTES = 100 * 1024;

/** Supported source types. Lyrics is the only vertical today. */
export const SourceTypeSchema = z.literal('lyrics');

/** Non-empty string with a max byte length. */
const nonEmptyText = (maxBytes: number) =>
  z
    .string()
    .min(1, 'Required.')
    .refine((v) => Buffer.byteLength(v, 'utf8') <= maxBytes, {
      message: `Text exceeds ${maxBytes} bytes.`,
    });

/** Input for creating a new lyric draft import. */
export const LyricDraftSchema = z.object({
  sourceType: SourceTypeSchema,
  title: nonEmptyText(500),
  artist: z.string().max(500).nullable().default(null),
  targetLanguage: z
    .string()
    .min(2, 'Target language is required.')
    .max(16),
  translationLanguage: z
    .string()
    .min(2)
    .max(16)
    .default('en'),
  notes: z.string().max(5000).nullable().default(null),
  rawText: nonEmptyText(MAX_LYRIC_TEXT_BYTES),
});

/** Partial update for a learning_source. All fields optional. */
export const UpdateLearningSourceSchema = z
  .object({
    title: nonEmptyText(500).optional(),
    artist: z.string().max(500).nullable().optional(),
    targetLanguage: z.string().min(2).max(16).optional(),
    translationLanguage: z.string().min(2).max(16).optional(),
    notes: z.string().max(5000).nullable().optional(),
    processingStatus: z
      .enum(['draft', 'analyzing', 'analyzed', 'analysis_failed', 'archived'])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required.',
  });

/** Input for recording a review attempt. */
export const RecordReviewAttemptSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required.'),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  timeSpentMs: z.number().int().nonnegative().optional(),
});

/** Realization type for a concept in a specific language. */
export const RealizationTypeSchema = z.enum([
  'word',
  'phrase',
  'construction',
  'feature',
  'morpheme',
]);

/** A user-authored concept realization. */
export const ConceptRealizationSchema = z.object({
  coreConceptId: z.string().min(1),
  languageCode: z.string().min(2).max(16),
  realizationType: RealizationTypeSchema,
  surfaceForm: z.string().min(1).max(500),
  gloss: z.string().max(500).nullable().default(null),
  grammaticalNote: z.string().max(2000).nullable().default(null),
  lemmaId: z.string().nullable().default(null),
});

/** A single target on a transfer card. */
export const DifficultyTargetSchema = z.object({
  coreConceptCode: z.string().min(1),
  isKnown: z.boolean(),
});

/** The budget a transfer card proposal is validated against. */
export const DifficultyBudgetSchema = z.object({
  targets: z.array(DifficultyTargetSchema).min(1, 'At least one target is required.'),
  maxUnknownTargets: z.number().int().nonnegative().default(1),
  minTargets: z.number().int().positive().default(1),
});

// ── Local-companion request schemas (Zod-validated by the companion) ───

/** Languages supported for CLCC generation. */
export const ClccLanguageSchema = z.enum(['fr', 'ru', 'fa']);

/** Body of POST /jobs/source-analysis. */
export const CompanionSourceAnalysisRequestSchema = z.object({
  sourceId: z.string().min(1),
  targetLanguageCode: z.string().min(2).max(16),
  translationLanguageCode: z.string().min(2).max(16),
  sourceContentChecksum: z.string().min(8).max(128),
  sourceLineCount: z.number().int().nonnegative(),
  sourceLines: z
    .array(
      z.object({
        ordinal: z.number().int().nonnegative(),
        rawText: z.string().max(16 * 1024),
        sectionLabel: z.string().max(200).nullable().optional(),
      }),
    )
    .min(1)
    .max(5000),
  modelLabel: z.string().max(100).optional(),
});

/** Body of POST /jobs/clcc-generation. */
export const CompanionClccGenerationRequestSchema = z.object({
  targetLanguageCode: ClccLanguageSchema,
  coreConceptCodes: z.array(z.string().min(1).max(64)).min(1).max(200),
  existingRealizationSurfaceForms: z.array(z.string().max(500)).optional(),
  modelLabel: z.string().max(100).optional(),
});

/** Clcc realization proposal (Zod-validated by the companion before emitting). */
export const ClccRealizationProposalSchema = z.object({
  coreConceptCode: z.string().min(1),
  languageCode: ClccLanguageSchema,
  realizationType: RealizationTypeSchema,
  surfaceForm: z.string().min(1).max(500),
  gloss: z.string().max(500).nullable(),
  grammaticalNote: z.string().max(2000).nullable(),
  lemmaProposalOrdinal: z.number().int().nonnegative().nullable(),
  senseKind: z.enum(['core', 'contextual', 'idiomatic']),
});

// ── Per-kind proposal payload discriminators ───────────────────────────

export const SectionProposalPayloadSchema = z.object({
  proposal_kind: z.literal('section'),
  payload: z.object({
    sourceId: z.string().min(1),
    ordinal: z.number().int().nonnegative(),
    sectionType: z.enum(['verse', 'chorus', 'bridge', 'intro', 'outro', 'stanza', 'section']),
    label: z.string().max(200).nullable(),
    lineOrdinals: z.array(z.number().int().nonnegative()),
  }),
});

export const LineTranslationProposalPayloadSchema = z.object({
  proposal_kind: z.literal('line_translation'),
  payload: z.object({
    sourceId: z.string().min(1),
    sourceLineId: z.string().min(1),
    translationText: z.string().min(1).max(4000),
    translationLanguageCode: z.string().min(2).max(16),
  }),
});

export const LemmaProposalPayloadSchema = z.object({
  proposal_kind: z.literal('lemma'),
  payload: z.object({
    languageCode: z.string().min(2).max(16),
    normalizedLemma: z.string().min(1).max(200),
    partOfSpeech: z.string().min(1).max(64),
    primaryGloss: z.string().max(500).nullable(),
    grammaticalGender: z.string().max(64).nullable(),
    animacy: z.string().max(64).nullable(),
    verbAspect: z.string().max(64).nullable(),
  }),
});

export const GrammarPatternProposalPayloadSchema = z.object({
  proposal_kind: z.literal('grammar_pattern'),
  payload: z.object({
    sourceId: z.string().nullable(),
    sourceSectionId: z.string().nullable(),
    sourceSegmentProposalOrdinal: z.number().int().nonnegative().nullable(),
    targetCoreConceptCode: z.string().min(1).nullable(),
    targetLemmaProposalOrdinal: z.number().int().nonnegative().nullable(),
    patternCode: z.string().min(1).max(200),
    patternLabel: z.string().min(1).max(200),
    explanation: z.string().max(4000).nullable(),
    exampleSourceText: z.string().max(2000).nullable(),
    exampleTargetText: z.string().max(2000).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    evidenceProvenance: z.enum(['source_line', 'source_section', 'generated_analysis', 'manual']),
  }),
});

export const ConceptMappingProposalPayloadSchema = z.object({
  proposal_kind: z.literal('concept_mapping'),
  payload: z.object({
    lemmaProposalOrdinal: z.number().int().nonnegative(),
    coreConceptCode: z.string().min(1),
    realizationNote: z.string().max(2000).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  }),
});

export const CardProposalPayloadSchema = z.object({
  proposal_kind: z.literal('card'),
  payload: z.object({
    sourceId: z.string().nullable(),
    sourceSectionId: z.string().nullable(),
    sourceLineId: z.string().nullable(),
    sourceSegmentProposalOrdinal: z.number().int().nonnegative().nullable(),
    cardKind: z.enum(['source_recognition', 'source_production', 'source_cloze', 'generated_transfer']),
    generatedContent: z.boolean(),
    lexicalLemmaProposalOrdinal: z.number().int().nonnegative().nullable().optional(),
    targetCoreConceptCode: z.string().min(1).nullable().optional(),
    targetRealizationProposalOrdinal: z.number().int().nonnegative().nullable().optional(),
    grammarPatternProposalOrdinal: z.number().int().nonnegative().nullable().optional(),
    prompt: z.string().min(1).max(2000),
    answer: z.string().min(1).max(2000),
    contextNote: z.string().max(2000).nullable(),
    difficultyBudget: DifficultyBudgetSchema.nullable().optional(),
  }),
});

/**
 * Discriminated union of per-kind proposal payload schemas. The companion
 * validates each emitted proposal against the matching arm; the PWA
 * re-validates on receive. Matches the AnalysisProposalPayload union in
 * analysis.ts.
 */
export const AnalysisProposalPayloadSchema = z.discriminatedUnion('proposal_kind', [
  SectionProposalPayloadSchema,
  // Segment, token_occurrence, realization payloads are not Zod-validated
  // for promotion in this checkpoint (their acceptance is deferred). They
  // persist as opaque jsonb; the UI still renders them.
  z.object({
    proposal_kind: z.literal('segment'),
    payload: z.record(z.string(), z.unknown()),
  }),
  LineTranslationProposalPayloadSchema,
  z.object({
    proposal_kind: z.literal('token_occurrence'),
    payload: z.record(z.string(), z.unknown()),
  }),
  LemmaProposalPayloadSchema,
  z.object({
    proposal_kind: z.literal('form'),
    payload: z.record(z.string(), z.unknown()),
  }),
  z.object({
    proposal_kind: z.literal('morphology'),
    payload: z.object({
      lexicalFormId: z.string().min(1),
      morphologySummary: z.string().min(1).max(2000),
    }),
  }),
  GrammarPatternProposalPayloadSchema,
  ConceptMappingProposalPayloadSchema,
  CardProposalPayloadSchema,
  z.object({
    proposal_kind: z.literal('realization'),
    payload: z.record(z.string(), z.unknown()),
  }),
]);
