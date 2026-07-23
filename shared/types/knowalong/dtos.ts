// shared/types/knowalong/dtos.ts
// Data-transfer objects for KnowAlong write paths. These are the wire
// shapes that services accept and Zod schemas validate against. They are
// narrower than the full entity types (omit server-generated fields like
// id, createdAt, updatedAt) so the caller can't accidentally set them.

import type { SourceType, ProcessingStatus, ReviewRating } from './enums';

/** Input for creating a new lyric draft import. */
export interface CreateLyricDraftDTO {
  sourceType: SourceType;
  title: string;
  artist: string | null;
  targetLanguage: string;
  translationLanguage: string;
  notes: string | null;
  /** Raw pasted text. Stored verbatim as the first source_lines. */
  rawText: string;
}

/** Partial update for a learning_source. All fields optional. */
export interface UpdateLearningSourceDTO {
  title?: string;
  artist?: string | null;
  targetLanguage?: string;
  translationLanguage?: string;
  notes?: string | null;
  processingStatus?: ProcessingStatus;
}

/** Input for recording a review attempt. */
export interface RecordReviewAttemptDTO {
  cardId: string;
  rating: ReviewRating;
  timeSpentMs?: number;
}

// ── Local-analysis + CLCC checkpoint ───────────────────────────────────

/** Input for starting a source-analysis run via the local companion. */
export interface StartSourceAnalysisDTO {
  sourceId: string;
  modelLabel?: string;
}

/** Input for starting a CLCC generation run. */
export interface StartClccGenerationDTO {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  modelLabel?: string;
}

/**
 * Input for reviewing a proposal. `action` selects the review path;
 * `editedPayload` is required when action = 'edit' and otherwise ignored.
 */
export interface ReviewProposalDTO {
  proposalId: string;
  action: 'accept' | 'edit' | 'reject';
  editedPayload?: Record<string, unknown>;
  reviewerNote?: string;
}

/** Per-proposal outcome from acceptBatch (no all-or-nothing claim). */
export interface ProposalBatchOutcome {
  proposalId: string;
  status: 'accepted' | 'write-failed' | 'blocked' | 'deferred' | 'rejected';
  reason?: string;
  curatedId?: string;
  prerequisiteProposalId?: string;
}

/** Result of a single acceptProposal call. */
export interface ProposalAcceptResult {
  status: 'ok' | 'write-failed' | 'blocked' | 'deferred';
  curatedId?: string;
  reason?: string;
  prerequisiteProposalId?: string;
}
