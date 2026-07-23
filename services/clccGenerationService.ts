// services/clccGenerationService.ts
// Orchestrates a CLCC (Core-Language-Concept-Cluster) generation run: creates
// the analysis_run (run_type = clcc_generation), POSTs to the companion,
// subscribes via SSE-over-fetch, persists sanitized events deduped by
// (run_id, ordinal), finalizes to awaiting_review or failed (with a specific
// failure_reason from the CompanionConnectionError taxonomy).
//
// CLCC promotion into concept_realizations is DEFERRED for this checkpoint.
// Realization proposals are reviewable / editable / rejectable / exportable
// only — they have NO acceptance path. See the acceptance matrix
// (deliverable 3, realization row).

import type {
  AnalysisEventSeverity,
  CompanionConnectionError,
  CompanionJobEvent,
  CompanionJobResult,
  CompanionClccGenerationRequest,
  StartClccGenerationDTO,
} from '../shared/types/knowalong';
import { isCompanionConnectionError } from '../shared/types/knowalong';
import {
  analysisRunRepository,
  analysisEventRepository,
  analysisProposalRepository,
  throwIfFailed,
} from '../utils/supabase/repositories';
import { companionClientService } from './companionClientService';
import { logger } from '../utils/logger';

function severityFromEvent(event: CompanionJobEvent): AnalysisEventSeverity {
  return (event.severity as AnalysisEventSeverity) ?? 'info';
}

// ── start ─────────────────────────────────────────────────────────────

export interface StartClccGenerationInput {
  userId: string;
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  modelLabel?: string;
}

export type StartClccGenerationOutcome =
  | { status: 'ok'; runId: string; companionJobId: string }
  | CompanionConnectionError;

async function start(input: StartClccGenerationInput): Promise<StartClccGenerationOutcome> {
  const { userId, targetLanguageCode, coreConceptCodes } = input;

  // Create the run row (queued).
  const createRes = await analysisRunRepository.createClccRun({
    userId,
    targetLanguageCode,
    coreConceptCodes,
    modelLabel: input.modelLabel,
  });
  const run = throwIfFailed(createRes, 'clccGenerationService.start: create run');

  // POST to companion.
  const body: CompanionClccGenerationRequest = {
    targetLanguageCode,
    coreConceptCodes,
    modelLabel: input.modelLabel,
  };
  const startRes = await companionClientService.startClccGeneration(body);
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
  throwIfFailed(connectingRes, 'clccGenerationService.start: transition to connecting');

  return { status: 'ok', runId: run.id, companionJobId };
}

// ── ingestEvents ──────────────────────────────────────────────────────

async function ingestEvents(
  runId: string,
  userId: string,
  events: CompanionJobEvent[],
): Promise<void> {
  if (events.length === 0) return;
  const existingRes = await analysisEventRepository.findByRun(runId, userId);
  if (!existingRes.success) {
    logger.warn('companion', 'ingestEvents: failed to fetch existing events', existingRes.error);
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
    logger.warn('companion', 'ingestEvents: appendBatch failed', appendRes.error);
  }
}

// ── finalize ──────────────────────────────────────────────────────────

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
  // Persist realization proposals. Acceptance is DEFERRED — they remain
  // pending/exportable only.
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
      logger.warn('companion', 'finalize: createBatch failed', createRes.error);
      await markFailed(runId, userId, {
        kind: 'companion.network-error',
        message: 'Failed to persist realization proposals.',
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
    logger.warn('companion', 'finalize: updateStatus failed', updateRes.error);
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
    logger.warn('companion', 'markFailed: updateStatus failed', res.error);
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
    logger.warn('companion', 'cancel: updateStatus failed', res.error);
  }
}

async function deleteRun(runId: string, userId: string): Promise<void> {
  const res = await analysisRunRepository.deleteRunAndProposals(runId, userId);
  if (!res.success) {
    logger.warn('companion', 'deleteRun: failed', res.error);
  }
}

export const clccGenerationService = {
  start,
  ingestEvents,
  finalize,
  fail,
  cancel,
  deleteRun,
};

export type { StartClccGenerationDTO };
