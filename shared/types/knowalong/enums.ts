// shared/types/knowalong/enums.ts
// KnowAlong domain enums. These mirror the CHECK constraints in the
// migrations exactly — the canonical source for allowed values is the SQL
// migration; this file is the TS mirror consumed by UI, services, and
// repositories. If a migration adds a value, update the matching CHECK +
// this file in the same change.

/** Top-level media type. Lyrics is the first vertical; future types (articles, subtitles, …) are extensions. */
export type SourceType = 'lyrics';

/** Lifecycle of a learning_source import. draft = pasted only; analyzing = analysis in flight; analyzed = analysis complete; analysis_failed = analysis errored; archived = user dismissed. */
export type ProcessingStatus = 'draft' | 'analyzing' | 'analyzed' | 'analysis_failed' | 'archived';

/** Structural subdivision of a source. Lyrics use verse/chorus/bridge; future sources may use stanza/section/etc. */
export type SectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'stanza' | 'section';

/** Per-line learner review state. 'new' is the floor; promotion requires explicit learner action, not just exposure. */
export type LineReviewStatus = 'new' | 'seen' | 'learning' | 'recognized' | 'mastered';

/** The kind of study card. Source-derived cards quote exact source text; generated_transfer cards are AI-constructed practice. */
export type CardKind = 'source_recognition' | 'source_production' | 'source_cloze' | 'generated_transfer';

/** Provisional scheduler status per card. NOT full FSRS — a provisional seam until a scheduler is wired. */
export type CardStatus = 'new' | 'learning' | 'review' | 'young' | 'mature';

/** The four-level FSRS-style review rating. */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

/** Learner evidence level per concept per language. Encountered is the floor; promotion is explicit. */
export type KnowledgeLevel = 'encountered' | 'recognized' | 'retrievable' | 'flexible';

/** Shape of a concept realization in a specific language. */
export type RealizationType = 'word' | 'phrase' | 'construction' | 'feature' | 'morpheme';

/** Where learner evidence for a card/concept came from. */
export type EvidenceProvenance = 'source_line' | 'source_section' | 'generated_analysis' | 'manual';

/** Universality tier for a core concept. 0 = most universal; 3 = most specific. Core 0–2 are seeded. */
export type ConceptTier = 0 | 1 | 2 | 3;

// ── Local-analysis + CLCC checkpoint (migrations 005–009) ──────────────
//
// The enums below mirror the CHECK constraints in migrations 005–009
// exactly. The migration is the canonical source for allowed values; this
// file is the TS mirror consumed by UI, services, and repositories.

/** Linguistic kind of a source segment. Distinct from SectionType (verse/chorus/…). */
export type SegmentKind = 'sentence' | 'clause' | 'phrase' | 'refrain_fragment' | 'annotation' | 'other';

/** Kind of local-companion run. source_analysis = lyric/text pipeline; clcc_generation = language-pack generation. */
export type AnalysisRunType = 'source_analysis' | 'clcc_generation';

/**
 * State machine for an analysis run. NO `succeeded` — analysis output is
 * proposal-only and always requires explicit review, so the happy-path
 * terminal state is `awaiting_review` (not `succeeded`).
 */
export type AnalysisRunStatus =
  | 'queued'
  | 'connecting'
  | 'running'
  | 'validating'
  | 'awaiting_review'
  | 'failed'
  | 'cancelled';

/** Severity of an analysis event. The stage_* values drive the progress card UI. */
export type AnalysisEventSeverity =
  | 'info'
  | 'progress'
  | 'warning'
  | 'error'
  | 'stage_start'
  | 'stage_complete'
  | 'stage_failed';

/**
 * Kind of analysis proposal. Mirrors migration 007's CHECK exactly. The
 * acceptance matrix (see _reports/local-analysis-clcc.md) defines the
 * per-kind destination (or deferred status).
 */
export type AnalysisProposalKind =
  | 'section'
  | 'segment'
  | 'line_translation'
  | 'token_occurrence'
  | 'lemma'
  | 'form'
  | 'morphology'
  | 'grammar_pattern'
  | 'concept_mapping'
  | 'card'
  | 'realization';

/** Review state of a proposal. `pending` is the floor on insert. */
export type ReviewStatus = 'pending' | 'accepted' | 'edited' | 'rejected' | 'superseded';

/** Sense kind for a lexical_senses row. */
export type SenseKind = 'core' | 'contextual' | 'idiomatic';

/** Provenance stamp for a study_card. NULL allowed (cards pre-date this column). */
export type CardProvenance = 'manual' | 'source_analysis' | 'clcc_generation';

/**
 * Proposal kinds whose Accept is disabled in this checkpoint because their
 * destination is deferred. Used by proposalReviewService and the UI to
 * render the deferred reason deterministically. Revision 3 correction H
 * added `segment`; `token_occurrence` and `realization` were already
 * deferred.
 */
export type DeferredAcceptanceKind = 'segment' | 'token_occurrence' | 'realization';
