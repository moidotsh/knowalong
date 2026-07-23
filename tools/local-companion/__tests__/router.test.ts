// tools/local-companion/__tests__/router.test.ts
// Bun-test suite for the router: auth, body limit, routing, not-found,
// capabilities.

import { describe, it, expect, beforeEach } from 'bun:test';
import { makeRouter } from '../router';
import { jobManager, JobManager } from '../jobManager';
import type { CompanionConfig } from '../config';

const fakeConfig: CompanionConfig = {
  token: 'a'.repeat(64),
  allowedOrigins: ['http://localhost:8081'],
  defaultModel: 'llama3.2:3b',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  port: 8765,
};

function makeAuthHeader(): Record<string, string> {
  return { Authorization: `Bearer ${fakeConfig.token}` };
}

describe('router', () => {
  beforeEach(() => {
    (jobManager as unknown as { _resetForTests: () => void })._resetForTests();
  });

  it('GET /health is unauthenticated and returns minimal body', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const res = await route(new Request('http://x/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: 'ok',
      version: '0.1.0',
      loopback: true,
      authenticationRequired: true,
    });
  });

  it('GET /capabilities without token returns 401', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const res = await route(new Request('http://x/capabilities'));
    expect(res.status).toBe(401);
  });

  it('GET /capabilities with token succeeds', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const res = await route(new Request('http://x/capabilities', { headers: makeAuthHeader() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.supportedRunTypes).toContain('source_analysis');
    expect(body.supportedLanguages).toEqual(['fr', 'ru', 'fa']);
  });

  it('POST /jobs/source-analysis with empty body returns 400', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const res = await route(
      new Request('http://x/jobs/source-analysis', {
        method: 'POST',
        headers: { ...makeAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /jobs/source-analysis creates a job and returns jobId', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager, ollamaAdapter: fakeOllamaAdapter() });
    const res = await route(
      new Request('http://x/jobs/source-analysis', {
        method: 'POST',
        headers: { ...makeAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'src-1',
          targetLanguageCode: 'ru',
          translationLanguageCode: 'en',
          sourceContentChecksum: 'a'.repeat(64),
          sourceLineCount: 1,
          sourceLines: [{ ordinal: 1, rawText: 'привет' }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.jobId).toBe('string');
    expect(jobManager.exists(body.jobId)).toBe(true);
  });

  it('GET unknown route returns 404', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const res = await route(new Request('http://x/no-such-path', { headers: makeAuthHeader() }));
    expect(res.status).toBe(404);
  });

  it('Body exceeding 256KB returns 413', async () => {
    const route = makeRouter({ config: fakeConfig, jobManager });
    const huge = 'x'.repeat(257 * 1024);
    const res = await route(
      new Request('http://x/jobs/source-analysis', {
        method: 'POST',
        headers: { ...makeAuthHeader(), 'Content-Type': 'application/json', 'Content-Length': String(huge.length + 2) },
        body: huge,
      }),
    );
    expect(res.status).toBe(413);
  });

  it('JobManager type export works (type-level only)', () => {
    const local: InstanceType<typeof JobManager> = new JobManager();
    expect(local).toBeDefined();
  });
});

function fakeOllamaAdapter() {
  return {
    defaultModel: 'llama3.2:3b',
    async listModels() {
      return ['llama3.2:3b'];
    },
    async validateModel(_m: string) {
      // ok
    },
    async generate() {
      return { text: '{"sections": []}', model: 'llama3.2:3b' };
    },
  };
}
