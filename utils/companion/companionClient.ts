// utils/companion/companionClient.ts
// HTTP + authenticated SSE-over-fetch client for the local companion.
// S8 carve-out: this file calls raw fetch() deliberately — fetchWithRetry
// wraps fetch with retry/timeout, but SSE needs a long-lived streaming
// fetch that must NOT be timed out or retried mid-stream. See
// eslint.structure.config.js S8 carve-out list.
//
// SECURITY INVARIANTS (load-bearing; tested in companionClient.test.ts):
//   1. The token NEVER appears in any URL, query string, event ID, or
//      persisted payload. It travels ONLY in the Authorization header.
//   2. Authorization header is ALWAYS present on authenticated requests.
//   3. Reconnect resumes via Last-Event-ID header (or ?since=N fallback).
//   4. AbortController.abort() cleanly closes the stream on teardown.
//   5. Connection errors are classified into the specific taxonomy
//      (companion.mixed-content-blocked, companion.unauthorized, …) so
//      the UI surfaces a specific user-facing message, not a generic one.

import type {
  CompanionConnectionError,
  CompanionErrorResponse,
  CompanionHealthResponse,
  CompanionCapabilitiesResponse,
  CompanionSourceAnalysisRequest,
  CompanionClccGenerationRequest,
  CompanionJobStatusResponse,
  CompanionJobEvent,
  CompanionJobResult,
} from '../../shared/types/knowalong';
import { isCompanionConnectionError } from '../../shared/types/knowalong';
import { readCompanionCredential } from './credential';
import { logger } from '../logger';

const DEFAULT_TIMEOUT_MS = 10_000;
const LONG_TIMEOUT_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 15_000;
const RECONNECT_DELAY_MS = 2_000;

// ── Credential lookup ─────────────────────────────────────────────────

async function requireCredential(): Promise<{ token: string; baseUrl: string }> {
  const cred = await readCompanionCredential();
  if (!cred) {
    const e: CompanionConnectionError = {
      kind: 'companion.unauthorized',
      message: 'No companion credential is saved. Paste the token from the companion banner first.',
    };
    throw e;
  }
  return cred;
}

// ── URL builder (token never in query string) ─────────────────────────

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number>): string {
  const url = new URL(baseUrl.replace(/\/$/, '') + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

// ── Error classification ──────────────────────────────────────────────

function classifyFetchError(error: unknown, targetUrl: string): CompanionConnectionError {
  const message = error instanceof Error ? error.message : String(error);
  // AbortError from explicit AbortController.signal is treated as close,
  // not an error — handled by the stream reader, not this classifier.
  if (error instanceof TypeError) {
    // Heuristic: https -> http loopback mixed-content block.
    if (
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      /^http:\/\//i.test(targetUrl)
    ) {
      return {
        kind: 'companion.mixed-content-blocked',
        message:
          'Your browser may block HTTPS→HTTP loopback. Try the local dev origin, or run KnowAlong locally.',
      };
    }
    return {
      kind: 'companion.unreachable',
      message: 'Companion not reachable. Is the local companion running on 127.0.0.1:8765?',
    };
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      kind: 'companion.timeout',
      message: 'Companion request timed out.',
    };
  }
  return { kind: 'companion.network-error', message };
}

function classifyStatusError(
  status: number,
  responseBody: CompanionErrorResponse | unknown,
): CompanionConnectionError {
  const body = responseBody as CompanionErrorResponse | undefined;
  const serverMessage = body?.error?.message;
  if (status === 401) {
    return {
      kind: 'companion.unauthorized',
      message: serverMessage ?? 'Companion rejected the token. Re-paste the token from the companion banner.',
    };
  }
  if (status === 403) {
    return {
      kind: 'companion.origin-forbidden',
      message:
        serverMessage ??
        'Companion did not allow this origin. Add this PWA origin to the companion allowedOrigins list.',
    };
  }
  return {
    kind: 'companion.network-error',
    message: serverMessage ?? `Companion responded with status ${status}.`,
  };
}

// ── fetchJson — typed JSON helper ─────────────────────────────────────

interface FetchJsonOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Authenticated (default true). Only /health is unauthenticated. */
  authenticated?: boolean;
}

async function fetchJson<T>(
  path: string,
  opts: FetchJsonOptions = {},
): Promise<{ status: 'ok'; data: T } | CompanionConnectionError> {
  let cred: { token: string; baseUrl: string } | null = null;
  if (opts.authenticated !== false) {
    try {
      cred = await requireCredential();
    } catch (e) {
      if (isCompanionConnectionError(e)) return e;
      throw e;
    }
  } else {
    // Unauthenticated (health) — still need base URL. Fall back to default.
    const saved = await readCompanionCredential();
    cred = saved ?? { token: '', baseUrl: 'http://127.0.0.1:8765' };
  }
  const url = buildUrl(cred.baseUrl, path);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // Compose signals: caller's signal aborts too.
  if (opts.signal) {
    // r4-exempt: { once: true } ensures the listener auto-removes after the first fire; the AbortController is locally scoped and dies with this fetch call.
    opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.authenticated !== false) headers.Authorization = `Bearer ${cred.token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      let parsed: unknown = null;
      try {
        parsed = await response.json();
      } catch {
        // Non-JSON error body — fall through with status-only classification.
      }
      return classifyStatusError(response.status, parsed);
    }
    const data = (await response.json()) as T;
    return { status: 'ok', data };
  } catch (e) {
    return classifyFetchError(e, url);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Authenticated SSE-over-fetch ──────────────────────────────────────

export interface AuthenticatedEventStreamOptions {
  sinceOrdinal?: number;
  onEvent: (event: CompanionJobEvent) => void;
  onHeartbeat?: () => void;
  onClose?: (reason: 'clean' | 'error') => void;
  onError?: (error: CompanionConnectionError) => void;
  signal?: AbortSignal;
}

/**
 * Open an authenticated SSE-over-fetch event stream. Uses raw fetch() with
 * Authorization + Last-Event-ID headers (native EventSource can NOT send
 * Authorization headers — that's why this exists). Returns a cleanup
 * function that aborts the underlying fetch.
 */
export async function openAuthenticatedEventStream(
  runId: string,
  options: AuthenticatedEventStreamOptions,
): Promise<(() => void) | CompanionConnectionError> {
  let cred: { token: string; baseUrl: string };
  try {
    cred = await requireCredential();
  } catch (e) {
    if (isCompanionConnectionError(e)) return e;
    throw e;
  }
  const url = buildUrl(cred.baseUrl, `/jobs/${encodeURIComponent(runId)}/events`, {
    since: options.sinceOrdinal ?? 0,
  });
  const controller = new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const cleanup = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  // Loop with reconnect on transient close (unless aborted).
  let lastOrdinal = options.sinceOrdinal ?? 0;
  let aborted = false;
  options.signal?.addEventListener('abort', () => {
    aborted = true;
    controller.abort();
  });

  try {
    while (!aborted) {
      const streamOutcome = await openStreamOnce({
        url,
        token: cred.token,
        lastOrdinal,
        onEvent: (event) => {
          if (typeof event.ordinal === 'number' && event.ordinal > lastOrdinal) {
            lastOrdinal = event.ordinal;
          }
          options.onEvent(event);
        },
        onHeartbeat: options.onHeartbeat,
        signal: controller.signal,
      });

      if (aborted) break;

      if ('kind' in streamOutcome && isCompanionConnectionError(streamOutcome)) {
        options.onClose?.('error');
        return streamOutcome;
      }
      if (streamOutcome.kind === 'terminal') {
        options.onClose?.('clean');
        return cleanup;
      }
      // transient close — wait briefly, then reconnect with Last-Event-ID cursor.
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
    }
    options.onClose?.('clean');
    return cleanup;
  } catch (e) {
    const classified = classifyFetchError(e, url);
    options.onError?.(classified);
    return classified;
  }
}

interface OpenStreamOnceOptions {
  url: string;
  token: string;
  lastOrdinal: number;
  onEvent: (event: CompanionJobEvent) => void;
  onHeartbeat?: () => void;
  signal: AbortSignal;
}

type StreamOnceOutcome =
  | { kind: 'transient' }
  | { kind: 'terminal' }
  | CompanionConnectionError;

async function openStreamOnce(opts: OpenStreamOnceOptions): Promise<StreamOnceOutcome> {
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${opts.token}`,
  };
  if (opts.lastOrdinal > 0) headers['Last-Event-ID'] = String(opts.lastOrdinal);

  let response: Response;
  try {
    response = await fetch(opts.url, { method: 'GET', headers, signal: opts.signal });
  } catch (e) {
    if (opts.signal.aborted) return { kind: 'terminal' };
    return classifyFetchError(e, opts.url);
  }
  if (response.status === 401) {
    return classifyStatusError(401, await safeJson(response));
  }
  if (response.status === 403) {
    return classifyStatusError(403, await safeJson(response));
  }
  if (!response.ok) {
    return classifyStatusError(response.status, await safeJson(response));
  }
  if (!response.body) {
    return { kind: 'transient' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let nextEvent: Partial<CompanionJobEvent> & { dataLines?: string[] } = { dataLines: [] };
  let lastDataAt = Date.now();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Heartbeat watchdog — emit heartbeat when idle for >15s.
      const now = Date.now();
      if (now - lastDataAt > HEARTBEAT_TIMEOUT_MS) {
        opts.onHeartbeat?.();
        lastDataAt = now;
      }

      // Split on \n\n (SSE frame boundary).
      let frameBoundary: number;
      while ((frameBoundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, frameBoundary);
        buffer = buffer.slice(frameBoundary + 2);
        const parsed = parseSseFrame(frame);
        if (parsed === 'heartbeat') {
          opts.onHeartbeat?.();
          lastDataAt = Date.now();
          continue;
        }
        if (!parsed) continue;
        lastDataAt = Date.now();
        // history-truncated signals the replay cursor reached the cap.
        if (parsed.kind === 'history-truncated') {
          opts.onEvent({
            kind: 'history-truncated',
            ordinal: parsed.ordinal ?? 0,
            severity: 'warning',
            message: 'Event history was truncated; older events are not available.',
          });
          continue;
        }
        if (typeof parsed.ordinal === 'number') {
          const severity = (parsed.severity ?? 'info') as CompanionJobEvent['severity'];
          opts.onEvent({
            kind: 'event',
            ordinal: parsed.ordinal,
            severity,
            stage: parsed.stage,
            message: parsed.message ?? '',
            payload: parsed.payload,
            eventId: parsed.eventId,
          });
        }
      }
    }
    return { kind: 'transient' };
  } catch (e) {
    if (opts.signal.aborted) return { kind: 'terminal' };
    return classifyFetchError(e, opts.url);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Already released — fine.
    }
  }
}

function parseSseFrame(
  frame: string,
):
  | 'heartbeat'
  | null
  | (Partial<CompanionJobEvent> & { eventId?: string }) {
  if (frame.trim().startsWith(':')) return 'heartbeat';
  if (!frame.trim()) return null;
  const lines = frame.split('\n');
  let event: string | undefined;
  let data: string | undefined;
  let id: string | undefined;
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data = (data ?? '') + line.slice(5).trim();
    else if (line.startsWith('id:')) id = line.slice(3).trim();
  }
  if (!data) return null;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return {
      kind: (parsed.kind as string | undefined) === 'history-truncated' ? 'history-truncated' : 'event',
      ordinal: typeof parsed.ordinal === 'number' ? parsed.ordinal : undefined,
      severity: parsed.severity as CompanionJobEvent['severity'] | undefined,
      stage: parsed.stage as string | undefined,
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      payload: (parsed.payload as Record<string, unknown>) ?? undefined,
      eventId: id,
    };
  } catch {
    return null;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────

export const companionClient = {
  async getHealth(): Promise<{ status: 'ok'; data: CompanionHealthResponse } | CompanionConnectionError> {
    return fetchJson<CompanionHealthResponse>('/health', { authenticated: false, timeoutMs: 3000 });
  },

  async getCapabilities(): Promise<{ status: 'ok'; data: CompanionCapabilitiesResponse } | CompanionConnectionError> {
    return fetchJson<CompanionCapabilitiesResponse>('/capabilities', { timeoutMs: DEFAULT_TIMEOUT_MS });
  },

  async startSourceAnalysis(
    body: CompanionSourceAnalysisRequest,
  ): Promise<{ status: 'ok'; data: { jobId: string } } | CompanionConnectionError> {
    return fetchJson<{ jobId: string }>('/jobs/source-analysis', {
      method: 'POST',
      body,
      timeoutMs: LONG_TIMEOUT_MS,
    });
  },

  async startClccGeneration(
    body: CompanionClccGenerationRequest,
  ): Promise<{ status: 'ok'; data: { jobId: string } } | CompanionConnectionError> {
    return fetchJson<{ jobId: string }>('/jobs/clcc-generation', {
      method: 'POST',
      body,
      timeoutMs: LONG_TIMEOUT_MS,
    });
  },

  async getJobStatus(
    jobId: string,
  ): Promise<{ status: 'ok'; data: CompanionJobStatusResponse } | CompanionConnectionError> {
    return fetchJson<CompanionJobStatusResponse>(`/jobs/${encodeURIComponent(jobId)}`, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  },

  async getJobEventsPage(
    jobId: string,
    sinceOrdinal: number,
  ): Promise<
    | { status: 'ok'; data: { events: CompanionJobEvent[] } }
    | CompanionConnectionError
  > {
    const path = `/jobs/${encodeURIComponent(jobId)}/events?since=${encodeURIComponent(String(sinceOrdinal))}`;
    return fetchJson<{ events: CompanionJobEvent[] }>(path, { timeoutMs: DEFAULT_TIMEOUT_MS });
  },

  async cancelJob(jobId: string): Promise<{ status: 'ok'; data: { cancelled: true } } | CompanionConnectionError> {
    return fetchJson<{ cancelled: true }>(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  },

  async getJobResult(
    jobId: string,
  ): Promise<{ status: 'ok'; data: CompanionJobResult } | CompanionConnectionError> {
    return fetchJson<CompanionJobResult>(`/jobs/${encodeURIComponent(jobId)}/result`, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  },
};

// Note: openAuthenticatedEventStream + fetchJson are exported above for the
// service layer. The companionClient object is the convenience surface for
// non-streaming endpoints. The classifiers + URL builder are also exported
// for testing.
export {
  fetchJson as companionFetchJson,
  classifyFetchError,
  classifyStatusError,
  buildUrl as buildCompanionUrl,
};

// Suppress unused-import warning for logger (used by services that compose this).
void logger;
