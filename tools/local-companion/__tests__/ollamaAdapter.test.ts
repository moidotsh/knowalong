// tools/local-companion/__tests__/ollamaAdapter.test.ts
// Ollama adapter: validateModel, generate retry, listModels parsing.

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createOllamaAdapter } from '../adapters/ollama';

function mockFetch(responses: Array<{ url: string; status: number; body: unknown }>) {
  const calls: { url: string; body: unknown }[] = [];
  const queue = [...responses];
  globalThis.fetch = mock(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, body: _init?.body });
    const match = queue.shift();
    if (!match) throw new Error('No mock response queued');
    return new Response(JSON.stringify(match.body), { status: match.status });
  }) as unknown as typeof fetch;
  return calls;
}

describe('ollama adapter', () => {
  beforeEach(() => {
    // reset globalThis.fetch
  });

  it('listModels returns the model names from /api/tags', async () => {
    mockFetch([
      { url: '/api/tags', status: 200, body: { models: [{ name: 'llama3.2:3b' }, { name: 'qwen2.5:7b' }] } },
    ]);
    const adapter = createOllamaAdapter({ baseUrl: 'http://x', defaultModel: 'llama3.2:3b' });
    const models = await adapter.listModels();
    expect(models).toEqual(['llama3.2:3b', 'qwen2.5:7b']);
  });

  it('validateModel throws when model is missing', async () => {
    mockFetch([
      { url: '/api/tags', status: 200, body: { models: [{ name: 'qwen2.5:7b' }] } },
    ]);
    const adapter = createOllamaAdapter({ baseUrl: 'http://x', defaultModel: 'qwen2.5:7b' });
    expect(adapter.validateModel('missing-model')).rejects.toThrow();
  });

  it('generate retries on failure then succeeds', async () => {
    mockFetch([
      { url: '/api/generate', status: 500, body: { error: 'oops' } },
      { url: '/api/generate', status: 200, body: { model: 'm', response: 'ok', done: true } },
    ]);
    const adapter = createOllamaAdapter({ baseUrl: 'http://x', defaultModel: 'm' });
    const result = await adapter.generate({ model: 'm', prompt: 'p', maxRetries: 2 });
    expect(result.text).toBe('ok');
  });

  // Phase 4: when onToken is provided, the adapter switches to stream:true
  // and invokes the callback for each chunk off the wire. The accumulated
  // text is returned exactly as the non-streaming path would return it.
  it('generate with onToken streams chunks, invokes callback, and accumulates text', async () => {
    const ndjsonLines = [
      JSON.stringify({ model: 'm', response: 'Hello', done: false }),
      JSON.stringify({ model: 'm', response: ', ', done: false }),
      JSON.stringify({ model: 'm', response: 'world!', done: true }),
    ].join('\n');

    const encoder = new TextEncoder();
    const streamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(ndjsonLines));
        controller.close();
      },
    });

    // `const` wrapper defeats CFA narrowing — `let` captured into a closure
    // gets narrowed to its initial value (`null`) and never widened back.
    const captured: { body: { stream?: boolean } | null } = { body: null };
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      captured.body = init?.body ? (JSON.parse(init.body as string) as { stream?: boolean }) : null;
      return new Response(streamBody, { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = createOllamaAdapter({ baseUrl: 'http://x', defaultModel: 'm' });
    const tokens: string[] = [];
    const result = await adapter.generate({
      model: 'm',
      prompt: 'p',
      onToken: (chunk) => {
        tokens.push(chunk);
      },
    });

    // Request body asked for streaming.
    expect(captured.body?.stream).toBe(true);
    // Each response chunk fired the callback exactly once.
    expect(tokens).toEqual(['Hello', ', ', 'world!']);
    // The accumulated text matches what a non-streaming call would return.
    expect(result.text).toBe('Hello, world!');
    expect(result.model).toBe('m');
  });

  it('generate without onToken keeps stream:false (non-streaming path unchanged)', async () => {
    const captured: { body: { stream?: boolean } | null } = { body: null };
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      captured.body = init?.body ? (JSON.parse(init.body as string) as { stream?: boolean }) : null;
      return new Response(JSON.stringify({ model: 'm', response: 'ok', done: true }), { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = createOllamaAdapter({ baseUrl: 'http://x', defaultModel: 'm' });
    const result = await adapter.generate({ model: 'm', prompt: 'p' });
    expect(captured.body?.stream).toBe(false);
    expect(result.text).toBe('ok');
  });
});
