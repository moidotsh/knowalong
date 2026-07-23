// services/localAnalysisService.ts
// Orchestrates a source-analysis run: creates the analysis_run row, POSTs to
// the companion, subscribes via SSE-over-fetch, persists sanitized events
// deduped by (run_id, ordinal), finalizes to awaiting_review or failed (with
// a specific failure_reason from the CompanionConnectionError taxonomy).
//
// PWA owns ALL Supabase writes. The companion NEVER writes to Supabase.

import type {
  AnalysisEventSeverity,
  CompanionConnectionError,
  CompanionJobEvent,
  CompanionJobResult,
  CompanionSourceAnalysisRequest,
  StartSourceAnalysisDTO,
} from '../shared/types/knowalong';
import { isCompanionConnectionError } from '../shared/types/knowalong';
import {
  analysisRunRepository,
  analysisEventRepository,
  analysisProposalRepository,
  learningSourceRepository,
  sourceSectionRepository,
  throwIfFailed,
} from '../utils/supabase/repositories';
import { companionClientService } from './companionClientService';
import { logger } from '../utils/logger';

// ── Helpers ───────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Non-browser fallback (shouldn't happen in PWA context). Returns a
  // clearly-flagged non-hash so the DB constraint (varchar(64)) still holds.
  return `fallback-${input.length.toString(16).padStart(2, '0')}`.padEnd(64, '0').slice(0, 64);
}

function severityFromEvent(event: CompanionJobEvent): AnalysisEventSeverity {
  // CompanionJobEvent.severity allows 'info' outside the AnalysisEventSeverity
  // enum; map 'info' → 'info' (already valid) and leave the rest.
  return (event.severity as AnalysisEventSeverity) ?? 'info';
}

// ── start ─────────────────────────────────────────────────────────────

export interface StartSourceAnalysisInput {
  userId: string;
  sourceId: string;
  modelLabel?: string;
}

export type StartSourceAnalysisOutcome =
  | { status: 'ok'; runId: string; companionJobId: string }
  | CompanionConnectionError;

/**
 * Create a queued analysis_run, fetch source + lines, POST to the companion,
 * record the companion jobId, transition to connecting. Returns the runId +
 * companionJobId on success, or the specific CompanionConnectionError on
 * failure (the run row is marked failed with the taxonomy kind).
 */
async function start(input: StartSourceAnalysisInput): Promise<StartSourceAnalysisOutcome> {
  const { userId, sourceId } = input;
  // Fetch source.
  const sourceRes = await learningSourceRepository.findById(sourceId, userId);
  const source = throwIfFailed(sourceRes, 'localAnalysisService.start: source lookup');
  if (!source) {
    const e: CompanionConnectionError = {
      kind: 'companion.network-error',
      message: 'Source not found.',
    };
    return e;
  }
  // Fetch sections + lines (for content + checksum).
  const sectionRes = await sourceSectionRepository.findBySource(sourceId, userId);
  const { lines } = throwIfFailed(sectionRes, 'localAnalysisService.start: section lookup');
  const orderedLines = [...lines].sort((a, b) => a.ordinal - b.ordinal);
  if (orderedLines.length === 0) {
    const e: CompanionConnectionError = {
      kind: 'companion.network-error',
      message: 'Source has no lines to analyze.',
    };
    return e;
  }

  // Compute checksum over raw text (NOT the raw text itself).
  const joined = orderedLines.map((l) => l.rawText).join('\n');
  const checksum = await sha256Hex(joined);

  // Create the run row (queued).
  const createRes = await analysisRunRepository.createSourceAnalysisRun({
    userId,
    sourceId,
    targetLanguageCode: source.targetLanguage,
    sourceContentChecksum: checksum,
    sourceLineCount: orderedLines.length,
    modelLabel: input.modelLabel,
    requestParams: { translationLanguageCode: source.translationLanguage },
  });
  const run = throwIfFailed(createRes, 'localAnalysisService.start: create run');

  // POST to companion.
  const body: CompanionSourceAnalysisRequest = {
    sourceId,
    targetLanguageCode: source.targetLanguage,
    translationLanguageCode: source.translationLanguage,
    sourceContentChecksum: checksum,
    sourceLineCount: orderedLines.length,
    sourceLines: orderedLines.map((l) => ({
      ordinal: l.ordinal,
      rawText: l.rawText,
      sectionLabel: null,
    })),
    modelLabel: input.modelLabel,
  };
  const startRes = await companionClientService.startSourceAnalysis(body);
  if (isCompanionConnectionError(startRes)) {
    await markFailed(run.id, userId, startRes);
    return startRes;
  }
  const companionJobId = startRes.data.jobId;

  // Record jobId + transition to connecting.
  const connectingRes = await analysisRunRepository.updateStatus(run.id, userId, {
    status: 'connecting',
    companionJobId,
    startedAt: new Date().toISOString(),
  });
  throwIfFailed(connectingRes, 'localAnalysisService.start: transition to connecting');

  return { status: 'ok', runId: run.id, companionJobId };
}

// ── ingestEvents ──────────────────────────────────────────────────────

/**
 * Persist a batch of streamed events. Dedup by ordinal against what's already
 * in the DB — the unique(run_id, ordinal) constraint would reject dupes anyway;
 * the pre-filter avoids the round-trip.
 */
async function ingestEvents(
  runId: string,
  userId: string,
  events: CompanionJobEvent[],
): Promise<void> {
  if (events.length === 0) return;
  const existingRes = await analysisEventRepository.findByRun(runId, userId);
  if (!existingRes.success) {
    logger.warn('analysis', 'ingestEvents: failed to fetch existing events', existingRes.error);
    return;
  }
  const seen = new Set(existingRes.data.map((e) => e.ordinal));
  const fresh = events.filter((e) => !seen.has(e.ordinal));
  if (fresh.length === 0) return;
  const appendRes = await analysisEventRepository.appendBatch({
    userId,
    runId,
    events: fresh.map((e) => ({
      ordinal: e.ordinal,
      severity: severityFromEvent(e),
      stage: e.stage ?? null,
      message: e.message.slice(0, 500),
      payload: e.payload ?? null,
    })),
  });
  if (!appendRes.success) {
    logger.warn('analysis', 'ingestEvents: appendBatch failed', appendRes.error);
  }
}

// ── finalize ──────────────────────────────────────────────────────────

/**
 * On stream close (clean terminal), fetch the result from the companion,
 * persist proposals as analysis_proposals rows, and transition the run to
 * awaiting_review.
 */
async function finalize(runId: string, userId: string, companionJobId: string): Promise<void> {
  const resultRes = await companionClientService.getJobResult(companionJobId);
  if (isCompanionConnectionError(resultRes)) {
    await markFailed(runId, userId, resultRes);
    return;
  }
  const result: CompanionJobResult = resultRes.data;
  if (result.status === 'failed') {
    await analysisRunRepository.updateStatus(runId, userId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      failureReason: result.failureReason ?? 'companion.network-error',
      summary: result.summary,
    });
    return;
  }
  // Persist proposals.
  if (result.proposals.length > 0) {
    const createRes = await analysisProposalRepository.createBatch({
      userId,
      runId,
      proposals: result.proposals.map((p) => ({
        proposalKind: p.proposalKind as never,
        ordinal: p.ordinal,
        payload: p.payload,
      })),
    });
    if (!createRes.success) {
      logger.warn('analysis', 'finalize: createBatch failed', createRes.error);
      await markFailed(runId, userId, {
        kind: 'companion.network-error',
        message: 'Failed to persist proposals.',
      });
      return;
    }
  }
  const updateRes = await analysisRunRepository.updateStatus(runId, userId, {
    status: 'awaiting_review',
    completedAt: new Date().toISOString(),
    summary: { ...result.summary, proposalCounts: result.proposalCounts },
  });
  if (!updateRes.success) {
    logger.warn('analysis', 'finalize: updateStatus failed', updateRes.error);
  }
}

// ── fail / cancel / delete ────────────────────────────────────────────

async function markFailed(runId: string, userId: string, error: CompanionConnectionError): Promise<void> {
  const res = await analysisRunRepository.updateStatus(runId, userId, {
    status: 'failed',
    completedAt: new Date().toISOString(),
    failureReason: error.kind,
  });
  if (!res.success) {
    logger.warn('analysis', 'markFailed: updateStatus failed', res.error);
  }
}

async function fail(runId: string, userId: string, error: CompanionConnectionError): Promise<void> {
  return markFailed(runId, userId, error);
}

async function cancel(runId: string, userId: string, companionJobId: string | null): Promise<void> {
  if (companionJobId) {
    await companionClientService.cancelJob(companionJobId);
  }
  const res = await analysisRunRepository.updateStatus(runId, userId, {
    status: 'cancelled',
    completedAt: new Date().toISOString(),
  });
  if (!res.success) {
    logger.warn('analysis', 'cancel: updateStatus failed', res.error);
  }
}

async function deleteRun(runId: string, userId: string): Promise<void> {
  const res = await analysisRunRepository.deleteRunAndProposals(runId, userId);
  if (!res.success) {
    logger.warn('analysis', 'deleteRun: failed', res.error);
  }
}

// ── Public surface ────────────────────────────────────────────────────

export const localAnalysisService = {
  start,
  ingestEvents,
  finalize,
  fail,
  cancel,
  deleteRun,
};

// Type-only re-export for callers that need the DTO shape.
export type { StartSourceAnalysisDTO };
