// services/companionClientService.ts
// Thin service-layer wrapper over the companion HTTP + SSE-over-fetch client.
// Adds structured logging + consistent CompanionConnectionError surfacing so
// React Query hooks and the analysis/CLCC orchestration services don't
// re-implement it. The companion NEVER writes to Supabase; this service owns
// zero DB writes.

import type {
  CompanionConnectionError,
  CompanionHealthResponse,
  CompanionCapabilitiesResponse,
  CompanionSourceAnalysisRequest,
  CompanionClccGenerationRequest,
  CompanionJobStatusResponse,
  CompanionJobResult,
  CompanionJobEvent,
} from '../shared/types/knowalong';
import { isCompanionConnectionError } from '../shared/types/knowalong';
import {
  companionClient,
  openAuthenticatedEventStream,
  type AuthenticatedEventStreamOptions,
} from '../utils/companion/companionClient';
import { logger } from '../utils/logger';

function logError(label: string, error: CompanionConnectionError): void {
  logger.warn('companion', `${label} failed`, { kind: error.kind, message: error.message });
}

export const companionClientService = {
  async getHealth(): Promise<{ status: 'ok'; data: CompanionHealthResponse } | CompanionConnectionError> {
    const result = await companionClient.getHealth();
    if (isCompanionConnectionError(result)) logError('getHealth', result);
    return result;
  },

  async getCapabilities(): Promise<{ status: 'ok'; data: CompanionCapabilitiesResponse } | CompanionConnectionError> {
    const result = await companionClient.getCapabilities();
    if (isCompanionConnectionError(result)) logError('getCapabilities', result);
    return result;
  },

  async startSourceAnalysis(
    body: CompanionSourceAnalysisRequest,
  ): Promise<{ status: 'ok'; data: { jobId: string } } | CompanionConnectionError> {
    const result = await companionClient.startSourceAnalysis(body);
    if (isCompanionConnectionError(result)) logError('startSourceAnalysis', result);
    return result;
  },

  async startClccGeneration(
    body: CompanionClccGenerationRequest,
  ): Promise<{ status: 'ok'; data: { jobId: string } } | CompanionConnectionError> {
    const result = await companionClient.startClccGeneration(body);
    if (isCompanionConnectionError(result)) logError('startClccGeneration', result);
    return result;
  },

  async getJobStatus(
    jobId: string,
  ): Promise<{ status: 'ok'; data: CompanionJobStatusResponse } | CompanionConnectionError> {
    const result = await companionClient.getJobStatus(jobId);
    if (isCompanionConnectionError(result)) logError('getJobStatus', result);
    return result;
  },

  async pollJobEvents(
    jobId: string,
    sinceOrdinal: number,
  ): Promise<
    | { status: 'ok'; data: { events: CompanionJobEvent[] } }
    | CompanionConnectionError
  > {
    // Polling fallback only — SSE-over-fetch is the primary transport.
    return companionClient.getJobEventsPage(jobId, sinceOrdinal);
  },

  async cancelJob(jobId: string): Promise<{ status: 'ok'; data: { cancelled: true } } | CompanionConnectionError> {
    const result = await companionClient.cancelJob(jobId);
    if (isCompanionConnectionError(result)) logError('cancelJob', result);
    return result;
  },

  async getJobResult(jobId: string): Promise<{ status: 'ok'; data: CompanionJobResult } | CompanionConnectionError> {
    const result = await companionClient.getJobResult(jobId);
    if (isCompanionConnectionError(result)) logError('getJobResult', result);
    return result;
  },

  /**
   * Open an authenticated SSE-over-fetch event stream. Delegated directly to
   * the client (no logging wrapper — the stream is long-lived; the hook owns
   * its lifecycle via AbortController). Returns either a cleanup function or
   * a CompanionConnectionError when the initial connection fails.
   */
  async openEventStream(
    jobId: string,
    options: AuthenticatedEventStreamOptions,
  ): Promise<(() => void) | CompanionConnectionError> {
    const result = await openAuthenticatedEventStream(jobId, options);
    if (isCompanionConnectionError(result)) logError('openEventStream', result);
    return result;
  },
};
