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
});
