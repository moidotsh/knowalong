// shared/types/knowalong/entities.ts
// CamelCase normalized domain types. These are the wire/domain types that
// services, hooks, and UI consume (D6). Repository implementations keep
// their own private `*Row` interfaces that map snake_case DB rows to these
// camelCase shapes; UI never imports raw row types.

import type {
  SourceType,
  ProcessingStatus,
  SectionType,
  LineReviewStatus,
  CardKind,
  CardStatus,
  ReviewRating,
  KnowledgeLevel,
  RealizationType,
  ConceptTier,
  SegmentKind,
  AnalysisRunType,
  AnalysisRunStatus,
  AnalysisEventSeverity,
  AnalysisProposalKind,
  ReviewStatus,
  SenseKind,
  EvidenceProvenance,
  CardProvenance,
} from './enums';
import type { Timestamps } from '../api';
import type { DifficultyBudget } from './difficultyBudget';

/** A user-pasted media import. Owner-only via direct user_id. */
export interface LearningSource extends Timestamps {
  id: string;
  userId: string;
  sourceType: SourceType;
  title: string;
  artist: string | null;
  targetLanguage: string;
  translationLanguage: string;
  notes: string | null;
  sourceContentHash: string | null;
  processingStatus: ProcessingStatus;
}

/** Ordered subdivision of a source (verse, chorus, …). */
export interface SourceSection extends Timestamps {
  id: string;
  sourceId: string;
  ordinal: number;
  sectionType: SectionType;
  label: string | null;
}

/** A single line of pasted source text + optional derivatives. */
export interface SourceLine extends Timestamps {
  id: string;
  sourceId: string;
  sectionId: string | null;
  ordinal: number;
  /** Verbatim user-pasted text. Never mutated. */
  rawText: string;
  /** Normalized derivative (whitespace/case canonicalization). Nullable + visibly labelled. */
  normalizedText: string | null;
  /** Translation into translationLanguage. Nullable + visibly labelled. */
  translation: string | null;
  /** Romanized/phonetic derivative. Nullable + visibly labelled. */
  transliteration: string | null;
  reviewStatus: LineReviewStatus;
}

/** Exact token position in source text, optionally linked to a resolved form. */
export interface TokenOccurrence {
  id: string;
  sourceLineId: string;
  lexicalFormId: string | null;
  ordinal: number;
  /** Verbatim token from source text. Never mutated. */
  surfaceToken: string;
  charStart: number | null;
  charEnd: number | null;
  createdAt: string;
}

/** Per-user dictionary head entry with optional grammar metadata. */
export interface LexicalLemma extends Timestamps {
  id: string;
  userId: string;
  languageCode: string;
  normalizedLemma: string;
  partOfSpeech: string;
  primaryGloss: string | null;
  grammaticalGender: string | null;
  animacy: string | null;
  verbAspect: string | null;
}

/** Inflected surface form for a lemma with morphology metadata. */
export interface LexicalForm extends Timestamps {
  id: string;
  lemmaId: string;
  surfaceForm: string;
  morphologySummary: string | null;
  grammaticalCase: string | null;
  grammaticalNumber: string | null;
  grammaticalPerson: string | null;
  tense: string | null;
}

/** Language-neutral concept in the seeded catalog. */
export interface CoreConcept {
  id: string;
  code: string;
  canonicalLabel: string;
  description: string | null;
  functionalCluster: string;
  tier: ConceptTier;
  createdAt: string;
}

/** Per-language surface form for a concept. user_id NULL = curated global. */
export interface ConceptRealization extends Timestamps {
  id: string;
  coreConceptId: string;
  /** NULL = curated global (read-only); set = owner-only. */
  userId: string | null;
  languageCode: string;
  realizationType: RealizationType;
  surfaceForm: string;
  gloss: string | null;
  grammaticalNote: string | null;
  lemmaId: string | null;
}

/** Per-user evidence level per concept per language. */
export interface LearnerConceptProgress extends Timestamps {
  id: string;
  userId: string;
  coreConceptId: string;
  languageCode: string;
  knowledgeLevel: KnowledgeLevel;
  evidenceCount: number;
  lastSeenAt: string | null;
}

/** Atomic review unit. Flexible target FKs encode provenance. */
export interface StudyCard extends Timestamps {
  id: string;
  userId: string;
  cardKind: CardKind;
  generatedContent: boolean;
  sourceId: string | null;
  sourceSectionId: string | null;
  sourceLineId: string | null;
  lexicalLemmaId: string | null;
  targetCoreConceptId: string | null;
  targetRealizationId: string | null;
  prompt: string;
  answer: string;
  contextNote: string | null;
  /** Context-only link to a source segment (migration 009). Does NOT satisfy the generated_transfer target requirement. */
  sourceSegmentId?: string | null;
  /** Fourth generated_transfer target (migration 009). Form is NOT a target in this checkpoint. */
  grammarPatternId?: string | null;
  /** Difficulty budget for generated cards. */
  difficultyBudget?: DifficultyBudget | null;
  /** Provenance stamp. NULL for cards that pre-date this column. */
  provenance?: CardProvenance | null;
  /** The analysis_run that produced this card (migration 009). SET NULL on run deletion. */
  sourceRunId?: string | null;
}

/** Provisional scheduler state per card. */
export interface ReviewState {
  cardId: string;
  cardStatus: CardStatus;
  dueAt: string | null;
  intervalDays: number | null;
  easeFactor: number | null;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
  updatedAt: string;
}

/** Review history entry. */
export interface ReviewAttempt {
  id: string;
  userId: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  timeSpentMs: number | null;
}

/** Persisted readiness score per source or section. */
export interface ReadinessSnapshot {
  id: string;
  userId: string;
  sourceId: string;
  sectionId: string | null;
  readinessScore: number;
  version: string;
  components: ReadinessSnapshotComponent[];
  calculatedAt: string;
}

/** JSONB-serialized component entry inside ReadinessSnapshot.components. */
export interface ReadinessSnapshotComponent {
  code: string;
  label: string;
  weight: number;
  raw: number;
  contribution: number;
}

// ── Local-analysis + CLCC checkpoint (migrations 005–009) ──────────────

/**
 * Analysis-derived linguistic segment. NO source-level start/end offset
 * columns — the ordered `lineSpan` (source_line_segments rows) is the
 * sole authoritative span representation (revision 3 correction J).
 * `assembledDisplayText` + `displayTextChecksum` are derived
 * reconstruction-integrity values.
 */
export interface SourceSegment extends Timestamps {
  id: string;
  userId: string;
  sourceId: string;
  sourceSectionId: string | null;
  /** Source-level ordinal (unique per source). Distinct from SourceLineSegmentLink.ordinal. */
  ordinal: number;
  segmentKind: SegmentKind;
  /** Deterministic reconstruction of the ordered lineSpan. */
  assembledDisplayText: string;
  /** sha256 of assembledDisplayText. */
  displayTextChecksum: string;
  label: string | null;
  /** The analysis_run that produced this segment (migration 009). SET NULL on run deletion. */
  sourceRunId?: string | null;
  /** Ordered line-span links. Populated by repositories on read; NOT a write path in this checkpoint. */
  lineSpan?: SourceLineSegmentLink[];
}

/**
 * One row of the authoritative span. start_offset/end_offset are
 * per-line offsets into `source_lines.raw_text` (nullable when the link
 * represents the whole line).
 */
export interface SourceLineSegmentLink {
  sourceLineId: string;
  sourceSegmentId: string;
  /** Position within the segment (1..N). */
  ordinal: number;
  /** Char offset into THIS line's raw_text. Validation: 0 <= start_offset <= end_offset <= length(raw_text). */
  startOffset: number | null;
  endOffset: number | null;
  /** Exact substring when partial; null when the link represents the whole line. */
  lineFragment: string | null;
  createdAt: string;
}

/** Persistent record of a local-companion analysis run. PWA-owned writes. */
export interface AnalysisRun extends Timestamps {
  id: string;
  userId: string;
  /** Nullable: set for source_analysis runs; NULL for CLCC runs that target a language. */
  sourceId: string | null;
  runType: AnalysisRunType;
  status: AnalysisRunStatus;
  targetLanguageCode: string;
  modelLabel: string | null;
  companionVersion: string | null;
  /** Job id returned by the local companion POST. NULL until the companion accepts the job. */
  companionJobId: string | null;
  /** sha256 of source content (NOT source text). */
  sourceContentChecksum: string | null;
  sourceLineCount: number | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Specific companion error taxonomy kind on failure. */
  failureReason: string | null;
  requestParams: Record<string, unknown>;
  summary: Record<string, unknown> | null;
}

/** Durable, sanitized event log entry. Append-only. */
export interface AnalysisEvent {
  id: string;
  userId: string;
  runId: string;
  ordinal: number;
  severity: AnalysisEventSeverity;
  stage: string | null;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Proposal-first draft row. `payload` is the per-kind typed shape (see
 * AnalysisProposalPayload union in analysis.ts). `editedPayload` captures
 * user edits while the original payload is retained.
 */
export interface AnalysisProposal extends Timestamps {
  id: string;
  userId: string;
  runId: string;
  proposalKind: AnalysisProposalKind;
  ordinal: number;
  reviewStatus: ReviewStatus;
  payload: Record<string, unknown>;
  editedPayload: Record<string, unknown> | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
}

/** Per-lemma sense entry. Destination for sense proposals (acceptance matrix). */
export interface LexicalSense extends Timestamps {
  id: string;
  userId: string;
  lemmaId: string;
  senseKind: SenseKind;
  gloss: string;
  definitionTargetLanguage: string;
  exampleText: string | null;
  confidence: number | null;
  evidenceProvenance: EvidenceProvenance;
  /** The analysis_run that produced this sense (migration 009). SET NULL on run deletion. */
  sourceRunId?: string | null;
}

/** Grammar pattern. A generated_transfer card may target one (migration 009). */
export interface GrammarPattern extends Timestamps {
  id: string;
  userId: string;
  sourceId: string | null;
  sourceSectionId: string | null;
  sourceSegmentId: string | null;
  targetCoreConceptId: string | null;
  targetLemmaId: string | null;
  patternCode: string;
  patternLabel: string;
  explanation: string | null;
  exampleSourceText: string | null;
  exampleTargetText: string | null;
  confidence: number | null;
  evidenceProvenance: EvidenceProvenance;
  /** The analysis_run that produced this pattern (migration 009). SET NULL on run deletion. */
  sourceRunId?: string | null;
}

/** Per-user mapping from a lexical lemma to a Core Concept. */
export interface LemmaConceptLink extends Timestamps {
  id: string;
  userId: string;
  lemmaId: string;
  coreConceptId: string;
  realizationNote: string | null;
  confidence: number | null;
  evidenceProvenance: EvidenceProvenance;
  /** The analysis_run that produced this link (migration 009). SET NULL on run deletion. */
  sourceRunId?: string | null;
}

/** Link row: which senses apply to which token occurrences. */
export interface TokenOccurrenceSenseLink {
  tokenOccurrenceId: string;
  senseId: string;
  createdAt: string;
}
