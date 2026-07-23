// tools/local-companion/router.ts
// Main HTTP request handler. Enforces:
//   - Body size limit (256KB)
//   - Bearer auth on every route except /health (constant-time compare)
//   - Strict CORS allowlist (no wildcard, no reflection)
//   - SSE response shape on /jobs/:id/events (real text/event-stream)
//   - JSON-only request bodies on POSTs
//   - Heartbeat every 15s on the SSE stream

import { z } from 'zod';
import type { CompanionConfig } from './config';
import type { JobState, JobManager } from './jobManager';
import { createOllamaAdapter, type OllamaAdapter } from './adapters/ollama';
import { runSourceAnalysisPipeline } from './pipelines/sourceAnalysis';
import { runClccPipeline } from './pipelines/clccGeneration';
import {
  CompanionSourceAnalysisRequestSchema,
  CompanionClccGenerationRequestSchema,
} from '../../shared/types/knowalong';
import type {
  CompanionErrorResponse,
  CompanionHealthResponse,
  CompanionJobStatusResponse,
  CompanionJobResult,
  CompanionJobEvent,
} from '../../shared/types/knowalong';
import { randomUUID } from 'node:crypto';
import { logger } from '../../utils/logger';

const BODY_LIMIT_BYTES = 256 * 1024;
const HEARTBEAT_INTERVAL_MS = 15_000;

export interface RouterDeps {
  config: CompanionConfig;
  jobManager: JobManager;
  /** Test-only injection point for a mock Ollama adapter. */
  ollamaAdapter?: OllamaAdapter;
}

type RouteHandler = (req: Request, params: Record<string, string>) => Promise<Response>;

interface RouteEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  auth: boolean;
}

export function makeRouter(deps: RouterDeps) {
  const routes = buildRoutes(deps);

  return async function route(req: Request): Promise<Response> {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflight(req, deps.config);
    }
    const url = new URL(req.url);
    const path = url.pathname;
    for (const entry of routes) {
      if (entry.method !== req.method) continue;
      const match = entry.pattern.exec(path);
      if (!match) continue;
      const params: Record<string, string> = {};
      entry.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });

      // CORS check (every route). Origin absent → allow (curl/CLI/same-origin).
      // Origin present + allowlist → reflect that exact origin. Else 403.
      const cors = applyCors(req, deps.config);
      if (cors === 'forbidden') {
        return jsonError(403, 'origin-forbidden', 'Origin not allowed.');
      }

      // Auth check
      if (entry.auth) {
        const ok = checkBearer(req, deps.config.token);
        if (!ok) {
          return jsonError(401, 'unauthorized', 'Bearer token required or mismatched.');
        }
      }

      // Body size limit (for POST bodies only).
      if (req.method === 'POST' || req.method === 'PUT') {
        const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
        if (contentLength > BODY_LIMIT_BYTES) {
          return jsonError(413, 'validation-error', 'Request body exceeds 256KB limit.');
        }
      }

      try {
        const response = await entry.handler(req, params);
        // Apply CORS headers to the actual response (narrowed to Record<string,string> above).
        for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
        return response;
      } catch (e) {
        logger.error('companion', 'route handler threw', e);
        return jsonError(500, 'internal-error', e instanceof Error ? e.message : 'Internal error.');
      }
    }

    return jsonError(404, 'not-found', `Route not found: ${req.method} ${path}`);
  };
}

// ── Routes ───────────────────────────────────────────────────────────

function buildRoutes(deps: RouterDeps): RouteEntry[] {
  return [
    {
      method: 'GET',
      pattern: /^\/health$/,
      paramNames: [],
      auth: false,
      handler: async () => {
        const body: CompanionHealthResponse = {
          status: 'ok',
          version: '0.1.0',
          loopback: true,
          authenticationRequired: true,
        };
        return jsonResponse(200, body);
      },
    },
    {
      method: 'GET',
      pattern: /^\/capabilities$/,
      paramNames: [],
      auth: true,
      handler: async () => {
        const ollama = deps.ollamaAdapter ?? createOllamaAdapter({
          baseUrl: deps.config.ollamaBaseUrl,
          defaultModel: deps.config.defaultModel,
        });
        let availableModels: Array<{ label: string; recommended?: boolean }> = [];
        try {
          const models = await ollama.listModels();
          availableModels = models.map((m) => ({ label: m, recommended: m === deps.config.defaultModel }));
        } catch {
          // Ollama unavailable — return empty list, don't fail capabilities.
        }
        return jsonResponse(200, {
          version: '0.1.0',
          supportedRunTypes: ['source_analysis', 'clcc_generation'],
          supportedLanguages: ['fr', 'ru', 'fa'],
          defaultModel: deps.config.defaultModel,
          availableModels,
        });
      },
    },
    {
      method: 'POST',
      pattern: /^\/jobs\/source-analysis$/,
      paramNames: [],
      auth: true,
      handler: async (req) => {
        const body = await readJsonBody(req);
        const parsed = CompanionSourceAnalysisRequestSchema.safeParse(body);
        if (!parsed.success) {
          return jsonError(400, 'validation-error', parsed.error.message);
        }
        const jobId = randomUUID();
        deps.jobManager.create(jobId, 'source_analysis', parsed.data);
        // Run async; do NOT await.
        void runSourceAnalysisPipeline(deps.jobManager.get(jobId)!, parsed.data, {
          ollama: deps.ollamaAdapter ?? createOllamaAdapter({
            baseUrl: deps.config.ollamaBaseUrl,
            defaultModel: deps.config.defaultModel,
          }),
        }).catch((e) => {
          deps.jobManager.fail(jobId, e instanceof Error ? e.message : String(e));
        });
        return jsonResponse(200, { jobId });
      },
    },
    {
      method: 'POST',
      pattern: /^\/jobs\/clcc-generation$/,
      paramNames: [],
      auth: true,
      handler: async (req) => {
        const body = await readJsonBody(req);
        const parsed = CompanionClccGenerationRequestSchema.safeParse(body);
        if (!parsed.success) {
          return jsonError(400, 'validation-error', parsed.error.message);
        }
        const jobId = randomUUID();
        deps.jobManager.create(jobId, 'clcc_generation', parsed.data);
        void runClccPipeline(deps.jobManager.get(jobId)!, parsed.data, {
          ollama: deps.ollamaAdapter ?? createOllamaAdapter({
            baseUrl: deps.config.ollamaBaseUrl,
            defaultModel: deps.config.defaultModel,
          }),
        }).catch((e) => {
          deps.jobManager.fail(jobId, e instanceof Error ? e.message : String(e));
        });
        return jsonResponse(200, { jobId });
      },
    },
    {
      method: 'GET',
      pattern: /^\/jobs\/([^/]+)$/,
      paramNames: ['id'],
      auth: true,
      handler: async (_req, params) => {
        const job = deps.jobManager.get(params.id);
        if (!job) return jsonError(404, 'not-found', 'Job not found.');
        const body: CompanionJobStatusResponse = {
          id: job.id,
          status: job.status,
          stage: job.stage,
          stageIndex: job.stageIndex,
          stageCount: job.stageCount,
          subProgress: job.subProgress,
          failureReason: job.failureReason,
        };
        return jsonResponse(200, body);
      },
    },
    {
      method: 'GET',
      pattern: /^\/jobs\/([^/]+)\/events$/,
      paramNames: ['id'],
      auth: true,
      handler: async (req, params) => {
        const job = deps.jobManager.get(params.id);
        if (!job) return jsonError(404, 'not-found', 'Job not found.');
        return streamSse(req, job, deps.jobManager);
      },
    },
    {
      method: 'POST',
      pattern: /^\/jobs\/([^/]+)\/cancel$/,
      paramNames: ['id'],
      auth: true,
      handler: async (_req, params) => {
        const ok = deps.jobManager.cancel(params.id);
        if (!ok) return jsonError(404, 'not-found', 'Job not found or already terminal.');
        return jsonResponse(200, { cancelled: true as const });
      },
    },
    {
      method: 'GET',
      pattern: /^\/jobs\/([^/]+)\/result$/,
      paramNames: ['id'],
      auth: true,
      handler: async (_req, params) => {
        const job = deps.jobManager.get(params.id);
        if (!job) return jsonError(404, 'not-found', 'Job not found.');
        const body: CompanionJobResult = {
          id: job.id,
          status: job.status,
          proposalCounts: job.result?.proposalCounts ?? {},
          proposals: job.result?.proposals ?? [],
          summary: job.result?.summary ?? {},
          failureReason: job.failureReason,
        };
        return jsonResponse(200, body);
      },
    },
  ];
}

// ── SSE stream ───────────────────────────────────────────────────────

async function streamSse(req: Request, job: JobState, _jobManager: JobManager): Promise<Response> {
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const lastEventIdHeader = req.headers.get('last-event-id');
  let sinceOrdinal = 0;
  if (lastEventIdHeader) {
    const n = parseInt(lastEventIdHeader, 10);
    if (!Number.isNaN(n)) sinceOrdinal = n;
  } else if (sinceParam) {
    const n = parseInt(sinceParam, 10);
    if (!Number.isNaN(n)) sinceOrdinal = n;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      // Replay retained events > cursor.
      const retained = job.events.filter((e) => e.ordinal > sinceOrdinal);
      for (const event of retained) {
        enqueue(formatSseFrame(event));
      }

      // If already terminal, close cleanly after replay.
      if (job.status === 'awaiting_review' || job.status === 'failed' || job.status === 'cancelled') {
        controller.close();
        return;
      }

      // Live stream: poll job.events for new arrivals + emit heartbeats.
      let lastOrdinal = retained.length > 0 ? retained[retained.length - 1].ordinal : sinceOrdinal;
      let lastHeartbeat = Date.now();
      const pump = setInterval(() => {
        const fresh = job.events.filter((e) => e.ordinal > lastOrdinal);
        for (const event of fresh) {
          enqueue(formatSseFrame(event));
          if (typeof event.ordinal === 'number' && event.ordinal > lastOrdinal) {
            lastOrdinal = event.ordinal;
          }
        }
        if (Date.now() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
          enqueue(': heartbeat\n\n');
          lastHeartbeat = Date.now();
        }
        if (job.status === 'awaiting_review' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(pump);
          controller.close();
        }
      }, 250);

      // Caller cancellation (AbortController).
      // r4-exempt: the listener is bound to the request signal and lives only as long as the request; the signal is GC'd with the request and the stream closes itself on terminal status.
      req.signal.addEventListener('abort', () => {
        clearInterval(pump);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function formatSseFrame(event: CompanionJobEvent): string {
  const data = jsonStringifyUtf8({
    kind: event.kind,
    ordinal: event.ordinal,
    severity: event.severity,
    stage: event.stage,
    message: event.message,
    payload: event.payload,
  });
  return `id: ${event.ordinal}\nevent: ${event.kind}\ndata: ${data}\n\n`;
}

/**
 * JSON.stringify that preserves printable non-ASCII characters as literal
 * UTF-8 instead of `\uXXXX` escapes. The default serializer escapes every
 * code point above U+007F, which made human-readable languages (Russian
 * Cyrillic, Persian Arabic script, French accented chars) render as
 * `\u0432\u0430\u043b` in the Studio UI.
 *
 * Both forms are valid JSON and parse to identical strings; the difference
 * is purely human-readability of the wire form.
 *
 * Limitation: a literal backslash + `u` + 4 hex chars in a source string
 * (e.g. `\u0041` as 6 literal characters) would be incorrectly unescaped.
 * Model-generated natural language never contains this pattern; the
 * limitation is acceptable for our use case (event payloads, JSON error
 * bodies, status responses). Control characters (< U+0020) and lone
 * surrogates (U+D800–U+DFFF) are kept escaped so the output remains valid
 * UTF-8.
 */
function jsonStringifyUtf8(obj: unknown): string {
  return JSON.stringify(obj).replace(
    /\\u([0-9a-fA-F]{4})/g,
    (m, hex: string) => {
      const cp = parseInt(hex, 16);
      if (cp < 0x20) return m;
      if (cp >= 0xd800 && cp <= 0xdfff) return m;
      return String.fromCodePoint(cp);
    },
  );
}

// ── CORS ─────────────────────────────────────────────────────────────

function applyCors(req: Request, config: CompanionConfig): Record<string, string> | 'forbidden' {
  const origin = req.headers.get('origin');
  if (!origin) return {}; // CLI / curl / same-origin
  if (config.allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Last-Event-ID, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      Vary: 'Origin',
    };
  }
  return 'forbidden';
}

function handleCorsPreflight(req: Request, config: CompanionConfig): Response {
  const cors = applyCors(req, config);
  if (cors === 'forbidden') {
    return jsonError(403, 'origin-forbidden', 'Origin not allowed.');
  }
  return new Response(null, { status: 204, headers: cors });
}

// ── Auth ─────────────────────────────────────────────────────────────

function checkBearer(req: Request, expectedToken: string): boolean {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const presented = match[1];
  return constantTimeEqual(presented, expectedToken);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Helpers ──────────────────────────────────────────────────────────

async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > BODY_LIMIT_BYTES) {
    // s10-exempt: caught by the route handler's try/catch and returned as a JSON error response.
    throw new Error('Request body exceeds 256KB limit.');
  }
  try {
    return JSON.parse(text);
  } catch {
    // s10-exempt: caught by the route handler's try/catch and returned as a JSON error response.
    throw new Error('Invalid JSON body.');
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(jsonStringifyUtf8(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(status: number, kind: CompanionErrorResponse['error']['kind'], message: string): Response {
  return jsonResponse(status, { error: { kind, message } });
}

// Exported for tests
export { applyCors, checkBearer, constantTimeEqual, formatSseFrame, jsonError, jsonStringifyUtf8, readJsonBody };
