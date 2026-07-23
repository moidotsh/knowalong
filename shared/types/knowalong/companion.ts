// shared/types/knowalong/companion.ts
// Wire types for the PWA <-> local-companion HTTP+SSE protocol. The
// companion binds 127.0.0.1 only, is opt-in, owns+generates its API
// token, and NEVER writes to Supabase. The PWA stores only a client-copy
// of the token. SSE-over-fetch (NOT native EventSource) is the primary
// transport — see utils/companion/companionClient.ts.
//
// The token NEVER appears in URLs, query strings, event IDs, or
// persisted payloads. It travels ONLY in the `Authorization: Bearer`
// header on every authenticated request.

import type { AnalysisEventSeverity } from './enums';

// ── Health / capabilities ──────────────────────────────────────────────

/** Minimal unauthenticated health response. NEVER includes models, token, or config. */
export interface CompanionHealthResponse {
  status: 'ok';
  version: string;
  loopback: true;
  authenticationRequired: true;
}

/** Authenticated capabilities response. Lists supported run types + models. */
export interface CompanionCapabilitiesResponse {
  version: string;
  supportedRunTypes: Array<'source_analysis' | 'clcc_generation'>;
  supportedLanguages: Array<'fr' | 'ru' | 'fa'>;
  defaultModel: string;
  availableModels: Array<{ label: string; recommended?: boolean }>;
}

// ── Job lifecycle ──────────────────────────────────────────────────────

/** Body for POST /jobs/source-analysis. Source text is sent as content slices only. */
export interface CompanionSourceAnalysisRequest {
  sourceId: string;
  targetLanguageCode: string;
  translationLanguageCode: string;
  /** sha256 of source_content — companion uses this for change detection, not raw text storage. */
  sourceContentChecksum: string;
  sourceLineCount: number;
  /** Source text slices (lines). The companion processes these in-memory and never persists them. */
  sourceLines: Array<{ ordinal: number; rawText: string; sectionLabel?: string | null }>;
  modelLabel?: string;
}

/** Body for POST /jobs/clcc-generation. Iterates Core Concepts from the request body. */
export interface CompanionClccGenerationRequest {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  /** Core Concepts to realize. Codes from the seeded catalog (migration 00003). */
  coreConceptCodes: string[];
  /** Existing user-owned realizations to avoid regenerating. */
  existingRealizationSurfaceForms?: string[];
  modelLabel?: string;
}

/** Companion job status (single-flight; never `succeeded` terminal). */
export type CompanionJobStatus =
  | 'queued'
  | 'connecting'
  | 'running'
  | 'validating'
  | 'awaiting_review'
  | 'failed'
  | 'cancelled';

/** Status response from GET /jobs/:id. */
export interface CompanionJobStatusResponse {
  id: string;
  status: CompanionJobStatus;
  stage: string | null;
  stageIndex: number | null;
  stageCount: number | null;
  subProgress: number | null;
  failureReason?: string;
}

/** A single sanitized event delivered via SSE or polling fallback. */
export interface CompanionJobEvent {
  kind: 'event' | 'history-truncated';
  /** Per-run monotonic ordinal. Dedup key alongside runId. */
  ordinal: number;
  severity: AnalysisEventSeverity | 'info';
  stage?: string;
  message: string;
  payload?: Record<string, unknown>;
  /** SSE `id:` line value. Used for Last-Event-ID resume. NEVER contains the token. */
  eventId?: string;
}

/**
 * A proposal emitted by the companion for the PWA to persist into
 * `analysis_proposals`. The PWA owns the write; the companion never touches
 * Supabase. Payload is the per-kind shape from analysis.ts.
 */
export interface CompanionResultProposal {
  proposalKind: string;
  ordinal: number;
  payload: Record<string, unknown>;
}

/** Final job result from GET /jobs/:id/result. Sanitized summary + proposals. */
export interface CompanionJobResult {
  id: string;
  status: CompanionJobStatus;
  /** Per-kind counts of proposals emitted (informational; matches proposals.length when grouped). */
  proposalCounts: Record<string, number>;
  /** Proposals the PWA should persist as analysis_proposals rows. */
  proposals: CompanionResultProposal[];
  summary: Record<string, unknown>;
  /** Present when status = 'failed'. Specific taxonomy kind. */
  failureReason?: string;
}

/** Standard companion error response. */
export interface CompanionErrorResponse {
  error: {
    kind: CompanionErrorKind;
    message: string;
  };
}

export type CompanionErrorKind =
  | 'unauthorized'
  | 'origin-forbidden'
  | 'not-found'
  | 'validation-error'
  | 'conflict'
  | 'rate-limited'
  | 'internal-error';

// ── PWA-side connection error taxonomy ─────────────────────────────────

/**
 * Discriminated union of connection errors the PWA surfaces with
 * specific user-facing messages (deliverable 5). Distinct from
 * CompanionErrorKind (server-emitted error response kinds) — these are
 * the client-side classification of why a companion call failed.
 */
export type CompanionConnectionError =
  | { kind: 'companion.unreachable'; message: string }
  | { kind: 'companion.mixed-content-blocked'; message: string }
  | { kind: 'companion.unauthorized'; message: string }
  | { kind: 'companion.origin-forbidden'; message: string }
  | { kind: 'companion.network-error'; message: string }
  | { kind: 'companion.timeout'; message: string };

/** Type-narrowing helper for the connection-error union. */
export function isCompanionConnectionError(
  value: unknown,
): value is CompanionConnectionError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof (value as { kind: unknown }).kind === 'string' &&
    (value as { kind: string }).kind.startsWith('companion.')
  );
}
