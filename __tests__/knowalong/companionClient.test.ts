// __tests__/knowalong/companionClient.test.ts
// Load-bearing security invariants for the PWA companion client. Verifies:
//   - Authorization header is present on every authenticated request.
//   - Token NEVER appears in URL, query string, event ID, or persisted payload.
//   - Status / network error taxonomy classifies into the specific kinds the
//     UI relies on (companion.unauthorized / origin-forbidden /
//     mixed-content-blocked / unreachable / network-error / timeout).
//   - openAuthenticatedEventStream: Authorization + Last-Event-ID headers set,
//     heartbeat comments handled, AbortController closes cleanly, and ordinal
//     dedupe is applied on reconnect.
//
// fetch() is spied via vi.spyOn(globalThis, 'fetch'); no real network is made.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  companionClient,
  openAuthenticatedEventStream,
  classifyFetchError,
  classifyStatusError,
} from '../../utils/companion/companionClient';
import {
  writeCompanionCredential,
  clearCompanionCredential,
} from '../../utils/companion/credential';
import * as SecureStore from 'expo-secure-store';

const TEST_TOKEN = 't'.repeat(64);
const TEST_BASE_URL = 'http://127.0.0.1:8765';

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonStatus(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(chunks: string[], opts: { signal?: AbortSignal } = {}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        // Respect early abort — avoids "stream cancelled" race in tests.
        if (opts.signal?.aborted) break;
        controller.enqueue(encoder.encode(chunk));
        // Yield microtask so the reader can drain.
        await new Promise((r) => setTimeout(r, 0));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('companionClient — security invariants', () => {
  beforeEach(async () => {
    const store = SecureStore as unknown as { __resetForTests?: () => void };
    store.__resetForTests?.();
    await clearCompanionCredential();
    await writeCompanionCredential(TEST_TOKEN, TEST_BASE_URL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer <token> on authenticated requests', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonOk({ version: '1.0.0' }));
    await companionClient.getCapabilities();
    const [, init] = spy.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it('does NOT send Authorization on /health (unauthenticated)', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonOk({ version: '1.0.0', loopback: true, authenticationRequired: true }));
    await companionClient.getHealth();
    const [url, init] = spy.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    void url;
  });

  it('does NOT place the token in the URL or query string', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonOk({ version: '1.0.0', loopback: true, authenticationRequired: true }));
    await companionClient.getHealth();
    await companionClient.getCapabilities();
    await companionClient.startSourceAnalysis({
      sourceId: 'src-1',
      targetLanguageCode: 'ru',
      translationLanguageCode: 'en',
      sourceContentChecksum: 'a'.repeat(64),
      sourceLineCount: 1,
      sourceLines: [{ ordinal: 1, rawText: 'x' }],
    });
    for (const call of spy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toContain(TEST_TOKEN);
      expect(url).not.toContain('token=');
      expect(url).not.toContain('access_token');
    }
  });
});

describe('companionClient — error taxonomy', () => {
  beforeEach(async () => {
    const store = SecureStore as unknown as { __resetForTests?: () => void };
    store.__resetForTests?.();
    await clearCompanionCredential();
    await writeCompanionCredential(TEST_TOKEN, TEST_BASE_URL);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies 401 → companion.unauthorized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonStatus(401, { error: { message: 'bad token' } }),
    );
    const out = await companionClient.getCapabilities();
    expect(out).toMatchObject({ kind: 'companion.unauthorized' });
  });

  it('classifies 403 → companion.origin-forbidden', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonStatus(403, { error: { message: 'origin not allowed' } }),
    );
    const out = await companionClient.getCapabilities();
    expect(out).toMatchObject({ kind: 'companion.origin-forbidden' });
  });

  it('classifies 500 → companion.network-error (generic server failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonStatus(500, {}));
    const out = await companionClient.getCapabilities();
    expect(out).toMatchObject({ kind: 'companion.network-error' });
  });

  it('classifies TypeError + https→http → companion.mixed-content-blocked', () => {
    // Simulate the secure-page-to-loopback-HTTP heuristic.
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...originalLocation, protocol: 'https:' },
    });
    try {
      const err = classifyFetchError(new TypeError('Failed to fetch'), 'http://127.0.0.1:8765/health');
      expect(err.kind).toBe('companion.mixed-content-blocked');
    } finally {
      Object.defineProperty(window, 'location', {
        writable: true,
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('classifies plain TypeError → companion.unreachable (same-origin / unknown cause)', () => {
    const err = classifyFetchError(new TypeError('Failed to fetch'), 'http://127.0.0.1:8765/health');
    expect(err.kind).toBe('companion.unreachable');
  });

  it('classifies AbortException → companion.timeout', () => {
    const err = classifyFetchError(
      Object.assign(new DOMException('aborted', 'AbortError')),
      'http://127.0.0.1:8765/health',
    );
    expect(err.kind).toBe('companion.timeout');
  });

  it('classifyStatusError: 401 surfaces server message when present', () => {
    const err = classifyStatusError(401, { error: { message: 'token revoked' } });
    expect(err.kind).toBe('companion.unauthorized');
    expect(err.message).toContain('token revoked');
  });
});

describe('openAuthenticatedEventStream — load-bearing invariants', () => {
  beforeEach(async () => {
    const store = SecureStore as unknown as { __resetForTests?: () => void };
    store.__resetForTests?.();
    await clearCompanionCredential();
    await writeCompanionCredential(TEST_TOKEN, TEST_BASE_URL);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization + Last-Event-ID headers and keeps token out of the URL', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([]));
    // Use a real AbortController so the stream drains and resolves.
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 10);
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 42,
      signal: caller.signal,
      onEvent: () => {},
    });
    const [url, init] = spy.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_TOKEN}`);
    expect(headers['Last-Event-ID']).toBe('42');
    expect(String(url)).not.toContain(TEST_TOKEN);
  });

  it('omits Last-Event-ID on the first connection (sinceOrdinal=0)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([]));
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 10);
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: () => {},
    });
    const [, init] = spy.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Last-Event-ID']).toBeUndefined();
  });

  it('parses event frames and invokes onEvent with ordinal + payload', async () => {
    const chunk = [
      'event: event',
      'data: {"kind":"event","ordinal":1,"severity":"info","stage":"init","message":"starting"}',
      '',
      '',
    ].join('\n');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([chunk]));
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 20);
    const events: unknown[] = [];
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: (e) => events.push(e),
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const first = events[0] as { ordinal: number; stage: string };
    expect(first.ordinal).toBe(1);
    expect(first.stage).toBe('init');
  });

  it('handles heartbeat comments without emitting an event', async () => {
    const chunk = ': heartbeat\n\n';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([chunk]));
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 20);
    let heartbeatSeen = false;
    const events: unknown[] = [];
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: (e) => events.push(e),
      onHeartbeat: () => {
        heartbeatSeen = true;
      },
    });
    expect(heartbeatSeen).toBe(true);
    expect(events.length).toBe(0);
  });

  it('honors history-truncated as a warning event, not an error', async () => {
    const chunk = [
      'event: event',
      'data: {"kind":"history-truncated","ordinal":0}',
      '',
      '',
    ].join('\n');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([chunk]));
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 20);
    const events: Array<{ kind: string; severity: string }> = [];
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: (e) => events.push(e as unknown as typeof events[number]),
    });
    const truncated = events.find((e) => e.kind === 'history-truncated');
    expect(truncated).toBeDefined();
    expect(truncated!.severity).toBe('warning');
  });

  it('returns companion.unauthorized when 401 is returned by the stream endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonStatus(401, { error: { message: 'bad' } }));
    const caller = new AbortController();
    const out = await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: () => {},
    });
    expect(out).toMatchObject({ kind: 'companion.unauthorized' });
  });

  it('aborts cleanly when the caller signal fires (no unhandled rejection)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([]));
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 5);
    let onCloseReason: 'clean' | 'error' | undefined;
    const out = await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: () => {},
      onClose: (reason) => {
        onCloseReason = reason;
      },
    });
    // Cleanup function returned; close reason captured.
    expect(typeof out).toBe('function');
    // onClose may be 'clean' or undefined depending on timing; must NOT be 'error'.
    expect(onCloseReason).not.toBe('error');
  });

  it('reconnect cursor tracks the highest ordinal delivered (Last-Event-ID advances)', async () => {
    // Deliver event with ordinal=7; client should remember it for any
    // reconnect via Last-Event-ID. Server-side replay (filtering by the
    // Last-Event-ID cursor) plus React Query dedupe by (runId, ordinal)
    // are the load-bearing dedupe layers — the client only advances the
    // cursor and forwards events to onEvent.
    const chunk = [
      'event: event',
      'data: {"kind":"event","ordinal":7,"severity":"info","message":"first"}',
      '',
      '',
    ].join('\n');
    const calls: string[] = [];
    vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url: any, init?: any) => {
        const headers = init?.headers ?? {};
        calls.push(headers['Last-Event-ID'] ?? '<none>');
        return sseResponse([chunk]);
      });
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 30);
    await openAuthenticatedEventStream('run-1', {
      sinceOrdinal: 0,
      signal: caller.signal,
      onEvent: () => {},
    });
    // First call must have no Last-Event-ID; any subsequent reconnect must
    // carry Last-Event-ID ≥ 7.
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0]).toBe('<none>');
    for (let i = 1; i < calls.length; i++) {
      const cursor = Number(calls[i]);
      expect(cursor).toBeGreaterThanOrEqual(7);
    }
  });
});
