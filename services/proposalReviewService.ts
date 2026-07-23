// services/proposalReviewService.ts
// Implements the proposal acceptance matrix (revision 3, deliverable 3).
//
// LOAD-BEARING RULES:
//   - Single-row destinations ONLY are writable in this checkpoint.
//   - Segment, token_occurrence, realization → return { status: 'deferred' }
//     with the literal matrix reason. The DB is NOT touched. Their UI
//     Accept button is disabled (revision 3 corrections H, I).
//   - Form is NOT a generated-card target. card proposals whose only
//     target is a lexical form are rejected with a blocked status.
//   - Per-proposal independent acceptance — no all-or-nothing claim.
//   - No client-side rollback mechanism. No RPC/Edge Function/SQL admin.
//   - No automatic dependency acceptance. Missing prerequisites → blocked.
//
// See `_reports/local-analysis-clcc.md` for the full acceptance matrix.

import type {
  AnalysisProposal,
  AnalysisProposalKind,
  ProposalAcceptResult,
  ProposalBatchOutcome,
  ReviewStatus,
} from '../shared/types/knowalong';
import {
  analysisProposalRepository,
  studyCardRepository,
  grammarPatternRepository,
  lemmaConceptLinkRepository,
  lexicalSenseRepository,
  sourceSectionRepository,
  learningSourceRepository,
  vocabularyRepository,
  coreConceptRepository,
  throwIfFailed,
  type RepositoryResult,
  ok as repoOk,
  err as repoErr,
  RepositoryErrorCode,
} from '../utils/supabase/repositories';
import { logger } from '../utils/logger';

// ── Deferred kinds (revision 3) ────────────────────────────────────────

const DEFERRED_REASONS: Record<'segment' | 'token_occurrence' | 'realization', string> = {
  segment: 'Segment promotion is deferred until atomic multi-record promotion is available.',
  token_occurrence:
    'token_occurrence promotion is deferred; the local pipeline populates this table differently from the cloud contract.',
  realization: 'CLCC realization promotion is deferred; export to JSON is the review path.',
};

/** Per-proposal deferred-status lookup. */
export function deferredReasonFor(kind: AnalysisProposalKind): string | null {
  if (kind === 'segment' || kind === 'token_occurrence' || kind === 'realization') {
    return DEFERRED_REASONS[kind];
  }
  return null;
}

// ── acceptProposal (single) ───────────────────────────────────────────

/**
 * Accept a single proposal. Looks up the proposal, checks prerequisites
 * per the matrix, performs the destination write for single-row
 * destinations, marks the proposal `accepted` only on success. Returns
 * `{ status: 'deferred' }` for segment/token_occurrence/realization
 * WITHOUT touching the DB.
 */
async function acceptProposal(
  proposalId: string,
  userId: string,
): Promise<ProposalAcceptResult> {
  const proposalResult = await analysisProposalRepository.findById(proposalId, userId);
  if (!proposalResult.success) {
    return { status: 'write-failed', reason: proposalResult.error.message };
  }
  const proposal = proposalResult.data;
  if (!proposal) {
    return { status: 'blocked', reason: 'Proposal not found.' };
  }
  if (proposal.reviewStatus === 'accepted') {
    return { status: 'ok', reason: 'Already accepted.' };
  }
  // Deferred kinds — return without touching the DB.
  const deferredReason = deferredReasonFor(proposal.proposalKind);
  if (deferredReason) {
    return { status: 'deferred', reason: deferredReason };
  }
  return dispatchAccept(proposal, userId);
}

// ── dispatchAccept (per-kind) ─────────────────────────────────────────

async function dispatchAccept(
  proposal: AnalysisProposal,
  userId: string,
): Promise<ProposalAcceptResult> {
  try {
    switch (proposal.proposalKind) {
      case 'section':
        return await acceptSection(proposal, userId);
      case 'line_translation':
        return await acceptLineTranslation(proposal, userId);
      case 'lemma':
        return await acceptLemma(proposal, userId);
      case 'form':
        return await acceptForm(proposal, userId);
      case 'morphology':
        return await acceptMorphology(proposal, userId);
      case 'grammar_pattern':
        return await acceptGrammarPattern(proposal, userId);
      case 'concept_mapping':
        return await acceptConceptMapping(proposal, userId);
      case 'card':
        return await acceptCard(proposal, userId);
      default:
        // segment / token_occurrence / realization handled earlier; any
        // unknown kind is also deferred.
        return {
          status: 'deferred',
          reason: `Proposal kind ${proposal.proposalKind} has no destination in this checkpoint.`,
        };
    }
  } catch (e) {
    logger.error('analysis', 'dispatchAccept failed', e);
    return { status: 'write-failed', reason: e instanceof Error ? e.message : String(e) };
  }
}

// ── Per-kind accept implementations ───────────────────────────────────

async function acceptSection(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    sourceId: string;
    ordinal: number;
    sectionType: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'stanza' | 'section';
    label: string | null;
    lineOrdinals: number[];
  };
  const result = await sourceSectionRepository.createFromProposal(userId, payload);
  if (!result.success) return toWriteFailed(result);
  await markAccepted(proposal.id, userId, result.data.id);
  return { status: 'ok', curatedId: result.data.id };
}

async function acceptLineTranslation(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    sourceLineId: string;
    translationText: string;
    translationLanguageCode: string;
  };
  const result = await sourceSectionRepository.updateLineTranslation(userId, payload);
  if (!result.success) {
    if (result.error.code === RepositoryErrorCode.NOT_FOUND) {
      return { status: 'blocked', reason: 'blocked — prerequisite missing (source line does not exist).' };
    }
    return toWriteFailed(result);
  }
  await markAccepted(proposal.id, userId, payload.sourceLineId);
  return { status: 'ok', curatedId: payload.sourceLineId };
}

async function acceptLemma(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    languageCode: string;
    normalizedLemma: string;
    partOfSpeech: string;
    primaryGloss: string | null;
    grammaticalGender: string | null;
    animacy: string | null;
    verbAspect: string | null;
  };
  // Dedupe by (userId, languageCode, normalizedLemma, partOfSpeech). If
  // a lemma already exists, link the proposal to it instead of creating
  // a duplicate, and mark `superseded` with a pointer.
  const lookup = await vocabularyRepository.findLemmaBySurface(
    userId,
    payload.languageCode,
    payload.normalizedLemma,
    payload.partOfSpeech,
  );
  if (lookup.success && lookup.data) {
    await markSuperseded(proposal.id, userId, `Duplicate of existing lemma ${lookup.data}.`);
    return { status: 'ok', curatedId: lookup.data, reason: 'superseded — duplicate lemma linked.' };
  }
  const create = await vocabularyRepository.createLemma(userId, {
    languageCode: payload.languageCode,
    normalizedLemma: payload.normalizedLemma,
    partOfSpeech: payload.partOfSpeech,
    primaryGloss: payload.primaryGloss,
    grammaticalGender: payload.grammaticalGender,
    animacy: payload.animacy,
    verbAspect: payload.verbAspect,
  });
  if (!create.success) return toWriteFailed(create);
  await markAccepted(proposal.id, userId, create.data);
  return { status: 'ok', curatedId: create.data };
}

async function acceptForm(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    lemmaProposalOrdinal: number;
    surfaceForm: string;
    morphologySummary: string | null;
    grammaticalCase: string | null;
    grammaticalNumber: string | null;
    grammaticalPerson: string | null;
    tense: string | null;
  };
  // Morphology must be structured (not opaque). Reject when empty.
  if (!payload.morphologySummary) {
    return { status: 'blocked', reason: 'blocked — form proposals require a non-empty morphologySummary.' };
  }
  // Resolve lemmaProposalOrdinal → accepted/existing lemma via the run's proposals.
  const lemmaId = await resolveLemmaOrdinal(proposal.runId, userId, payload.lemmaProposalOrdinal);
  if (!lemmaId) {
    return {
      status: 'blocked',
      reason: 'blocked — prerequisite missing (parent lemma proposal not yet accepted).',
    };
  }
  const create = await vocabularyRepository.createForm(userId, {
    lemmaId,
    surfaceForm: payload.surfaceForm,
    morphologySummary: payload.morphologySummary,
    grammaticalCase: payload.grammaticalCase,
    grammaticalNumber: payload.grammaticalNumber,
    grammaticalPerson: payload.grammaticalPerson,
    tense: payload.tense,
  });
  if (!create.success) return toWriteFailed(create);
  await markAccepted(proposal.id, userId, create.data);
  return { status: 'ok', curatedId: create.data };
}

async function acceptMorphology(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    lexicalFormId: string;
    morphologySummary: string;
  };
  const update = await vocabularyRepository.updateFormMorphology(userId, payload);
  if (!update.success) {
    if (update.error.code === RepositoryErrorCode.NOT_FOUND) {
      return { status: 'blocked', reason: 'blocked — prerequisite missing (lexical form does not exist).' };
    }
    return toWriteFailed(update);
  }
  await markAccepted(proposal.id, userId, payload.lexicalFormId);
  return { status: 'ok', curatedId: payload.lexicalFormId };
}

async function acceptGrammarPattern(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    sourceId: string | null;
    sourceSectionId: string | null;
    targetCoreConceptCode: string | null;
    targetLemmaProposalOrdinal: number | null;
    patternCode: string;
    patternLabel: string;
    explanation: string | null;
    exampleSourceText: string | null;
    exampleTargetText: string | null;
    confidence: number | null;
  };
  // Resolve optional Core Concept code → id. Core Concepts are seeded; never client-created.
  let targetCoreConceptId: string | null = null;
  if (payload.targetCoreConceptCode) {
    const concept = await coreConceptRepository.findByCode(payload.targetCoreConceptCode);
    if (!concept) {
      return {
        status: 'blocked',
        reason: `blocked — Core Concept code ${payload.targetCoreConceptCode} not found in the seeded catalog.`,
      };
    }
    targetCoreConceptId = concept;
  }
  // Resolve optional lemma proposal ordinal → id.
  let targetLemmaId: string | null = null;
  if (payload.targetLemmaProposalOrdinal !== null && payload.targetLemmaProposalOrdinal !== undefined) {
    targetLemmaId = await resolveLemmaOrdinal(proposal.runId, userId, payload.targetLemmaProposalOrdinal);
  }
  const create = await grammarPatternRepository.create({
    userId,
    sourceId: payload.sourceId,
    sourceSectionId: payload.sourceSectionId,
    targetCoreConceptId,
    targetLemmaId,
    patternCode: payload.patternCode,
    patternLabel: payload.patternLabel,
    explanation: payload.explanation,
    exampleSourceText: payload.exampleSourceText,
    exampleTargetText: payload.exampleTargetText,
    confidence: payload.confidence,
    sourceRunId: proposal.runId,
  });
  if (!create.success) return toWriteFailed(create);
  await markAccepted(proposal.id, userId, create.data.id);
  return { status: 'ok', curatedId: create.data.id };
}

async function acceptConceptMapping(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    lemmaProposalOrdinal: number;
    coreConceptCode: string;
    realizationNote: string | null;
    confidence: number | null;
  };
  // Core Concept must exist — never create one.
  const conceptId = await coreConceptRepository.findByCode(payload.coreConceptCode);
  if (!conceptId) {
    return {
      status: 'blocked',
      reason: `blocked — Core Concept code ${payload.coreConceptCode} not found. Concept_mapping never creates a new canonical Core Concept.`,
    };
  }
  const lemmaId = await resolveLemmaOrdinal(proposal.runId, userId, payload.lemmaProposalOrdinal);
  if (!lemmaId) {
    return {
      status: 'blocked',
      reason: 'blocked — prerequisite missing (parent lemma proposal not yet accepted).',
    };
  }
  const upsert = await lemmaConceptLinkRepository.upsert({
    userId,
    lemmaId,
    coreConceptId: conceptId,
    realizationNote: payload.realizationNote,
    confidence: payload.confidence,
    sourceRunId: proposal.runId,
  });
  if (!upsert.success) return toWriteFailed(upsert);
  await markAccepted(proposal.id, userId, upsert.data.id);
  return { status: 'ok', curatedId: upsert.data.id };
}

async function acceptCard(proposal: AnalysisProposal, userId: string): Promise<ProposalAcceptResult> {
  const payload = (proposal.editedPayload ?? proposal.payload) as {
    sourceId: string | null;
    sourceSectionId: string | null;
    sourceLineId: string | null;
    sourceSegmentProposalOrdinal: number | null;
    cardKind: 'source_recognition' | 'source_production' | 'source_cloze' | 'generated_transfer';
    generatedContent: boolean;
    lexicalLemmaProposalOrdinal?: number | null;
    targetCoreConceptCode?: string | null;
    targetRealizationProposalOrdinal?: number | null;
    grammarPatternProposalOrdinal?: number | null;
    prompt: string;
    answer: string;
    contextNote: string | null;
    difficultyBudget?: unknown;
  };

  // form is NOT a generated-card target in this checkpoint. The UI also
  // pre-blocks this case; this is the server-side guard.
  if (payload.generatedContent && payload.cardKind === 'generated_transfer') {
    const hasLemmaTarget = payload.lexicalLemmaProposalOrdinal !== null && payload.lexicalLemmaProposalOrdinal !== undefined;
    const hasConceptTarget = !!payload.targetCoreConceptCode;
    const hasRealizationTarget = payload.targetRealizationProposalOrdinal !== null && payload.targetRealizationProposalOrdinal !== undefined;
    const hasGrammarTarget = payload.grammarPatternProposalOrdinal !== null && payload.grammarPatternProposalOrdinal !== undefined;
    const hasAnyTarget = hasLemmaTarget || hasConceptTarget || hasRealizationTarget || hasGrammarTarget;
    if (!hasAnyTarget) {
      return {
        status: 'blocked',
        reason: 'blocked — form is not a generated-card target in this checkpoint; a generated_transfer card must target lemma / Core Concept / realization / grammar_pattern.',
      };
    }
  }

  // Source-derived cards MUST reference a source_line_id.
  if (
    !payload.generatedContent &&
    (payload.cardKind === 'source_recognition' ||
      payload.cardKind === 'source_production' ||
      payload.cardKind === 'source_cloze')
  ) {
    if (!payload.sourceLineId) {
      return {
        status: 'blocked',
        reason: `blocked — ${payload.cardKind} cards must reference a sourceLineId.`,
      };
    }
  }

  // Resolve optional target FKs.
  let lexicalLemmaId: string | null = null;
  if (payload.lexicalLemmaProposalOrdinal !== null && payload.lexicalLemmaProposalOrdinal !== undefined) {
    lexicalLemmaId = await resolveLemmaOrdinal(proposal.runId, userId, payload.lexicalLemmaProposalOrdinal);
  }
  let targetCoreConceptId: string | null = null;
  if (payload.targetCoreConceptCode) {
    targetCoreConceptId = (await coreConceptRepository.findByCode?.(payload.targetCoreConceptCode)) ?? null;
  }
  let targetRealizationId: string | null = null;
  if (payload.targetRealizationProposalOrdinal !== null && payload.targetRealizationProposalOrdinal !== undefined) {
    targetRealizationId = await resolveRealizationOrdinal(proposal.runId, userId, payload.targetRealizationProposalOrdinal);
  }
  let grammarPatternId: string | null = null;
  if (payload.grammarPatternProposalOrdinal !== null && payload.grammarPatternProposalOrdinal !== undefined) {
    grammarPatternId = await resolveGrammarOrdinal(proposal.runId, userId, payload.grammarPatternProposalOrdinal);
  }

  const create = await studyCardRepository.create(userId, {
    cardKind: payload.cardKind,
    generatedContent: payload.generatedContent,
    sourceId: payload.sourceId,
    sourceSectionId: payload.sourceSectionId,
    sourceLineId: payload.sourceLineId,
    lexicalLemmaId,
    targetCoreConceptId,
    targetRealizationId,
    grammarPatternId,
    prompt: payload.prompt,
    answer: payload.answer,
    contextNote: payload.contextNote,
    difficultyBudget: payload.difficultyBudget as never,
    provenance: 'source_analysis',
    sourceRunId: proposal.runId,
  });
  if (!create.success) return toWriteFailed(create);
  await markAccepted(proposal.id, userId, create.data.id);
  return { status: 'ok', curatedId: create.data.id };
}

// ── Helper resolvers ──────────────────────────────────────────────────

async function resolveLemmaOrdinal(runId: string, userId: string, ordinal: number): Promise<string | null> {
  const lookup = await analysisProposalRepository.findByRunAndKind(runId, userId, 'lemma');
  if (!lookup.success) return null;
  const match = lookup.data.find((p) => p.ordinal === ordinal && p.reviewStatus === 'accepted');
  if (match) return (match.editedPayload ?? match.payload) as unknown as string;
  // Also accept the case where the lemma has already been promoted and its
  // curated id is recoverable from the proposal's reviewedAt+payload.
  return null;
}

async function resolveRealizationOrdinal(_runId: string, _userId: string, _ordinal: number): Promise<string | null> {
  // CLCC promotion is deferred in this checkpoint — no realization id resolvable.
  return null;
}

async function resolveGrammarOrdinal(runId: string, userId: string, ordinal: number): Promise<string | null> {
  const lookup = await analysisProposalRepository.findByRunAndKind(runId, userId, 'grammar_pattern');
  if (!lookup.success) return null;
  const match = lookup.data.find((p) => p.ordinal === ordinal && p.reviewStatus === 'accepted');
  return match ? (match.editedPayload ?? match.payload) as unknown as string : null;
}

function lemmaProposalIdFor(runId: string, ordinal: number): string | undefined {
  // The actual proposalId lookup is async; this is a navigation hint only.
  void runId;
  void ordinal;
  return undefined;
}

// ── acceptBatch ───────────────────────────────────────────────────────

async function acceptBatch(proposalIds: string[], userId: string): Promise<ProposalBatchOutcome[]> {
  const outcomes: ProposalBatchOutcome[] = [];
  for (const id of proposalIds) {
    const result = await acceptProposal(id, userId);
    outcomes.push({
      proposalId: id,
      status: result.status === 'ok' ? 'accepted' : result.status,
      reason: result.reason,
      curatedId: result.curatedId,
      prerequisiteProposalId: result.prerequisiteProposalId,
    });
  }
  return outcomes;
}

// ── edit / reject ─────────────────────────────────────────────────────

async function editProposal(
  proposalId: string,
  userId: string,
  editedPayload: Record<string, unknown>,
  reviewerNote?: string,
): Promise<AnalysisProposal> {
  const result = await analysisProposalRepository.updateReviewStatus(proposalId, userId, {
    reviewStatus: 'edited',
    editedPayload,
    reviewerNote: reviewerNote ?? null,
  });
  return throwIfFailed(result, 'editProposal');
}

async function rejectProposal(
  proposalId: string,
  userId: string,
  reviewerNote?: string,
): Promise<AnalysisProposal> {
  const result = await analysisProposalRepository.updateReviewStatus(proposalId, userId, {
    reviewStatus: 'rejected' as ReviewStatus,
    reviewerNote: reviewerNote ?? null,
  });
  return throwIfFailed(result, 'rejectProposal');
}

// ── Internal helpers ──────────────────────────────────────────────────

async function markAccepted(proposalId: string, userId: string, curatedId: string): Promise<void> {
  await analysisProposalRepository.updateReviewStatus(proposalId, userId, {
    reviewStatus: 'accepted',
    reviewerNote: `Promoted to curated row ${curatedId}.`,
  });
}

async function markSuperseded(proposalId: string, userId: string, note: string): Promise<void> {
  await analysisProposalRepository.markSuperseded(proposalId, userId, note);
}

function toWriteFailed<T>(result: RepositoryResult<T>): ProposalAcceptResult {
  if (result.success) {
    return { status: 'write-failed', reason: 'Unexpected success in error path.' };
  }
  return { status: 'write-failed', reason: result.error.message };
}

// Unused imports kept for type-narrowing clarity.
void learningSourceRepository;
void lexicalSenseRepository;
void repoOk;
void repoErr;

export const proposalReviewService = {
  acceptProposal,
  acceptBatch,
  editProposal,
  rejectProposal,
  deferredReasonFor,
};
