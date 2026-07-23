// tools/local-companion/__tests__/cors.test.ts
// 5-case CORS test: allowed dev, configured deployed, unlisted rejected,
// absent Origin (no headers applied), no wildcard ever.

import { describe, it, expect } from 'bun:test';
import { applyCors } from '../router';
import type { CompanionConfig } from '../config';

const config: CompanionConfig = {
  token: 'a'.repeat(64),
  allowedOrigins: ['http://localhost:8081', 'https://knowalong.example'],
  defaultModel: 'llama3.2:3b',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  port: 8765,
};

describe('CORS', () => {
  it('allows an explicitly-listed dev origin (reflects exact origin)', () => {
    const req = new Request('http://x/health', { headers: { Origin: 'http://localhost:8081' } });
    const cors = applyCors(req, config);
    expect(cors).not.toBe('forbidden');
    expect((cors as Record<string, string>)['Access-Control-Allow-Origin']).toBe('http://localhost:8081');
  });

  it('allows an explicitly-listed deployed origin', () => {
    const req = new Request('http://x/health', { headers: { Origin: 'https://knowalong.example' } });
    const cors = applyCors(req, config);
    expect(cors).not.toBe('forbidden');
    expect((cors as Record<string, string>)['Access-Control-Allow-Origin']).toBe('https://knowalong.example');
  });

  it('rejects an unlisted origin with forbidden', () => {
    const req = new Request('http://x/health', { headers: { Origin: 'https://evil.example' } });
    const cors = applyCors(req, config);
    expect(cors).toBe('forbidden');
  });

  it('applies no CORS headers when Origin is absent (CLI/curl/same-origin)', () => {
    const req = new Request('http://x/health');
    const cors = applyCors(req, config);
    expect(cors).toEqual({});
  });

  it('NEVER produces a wildcard Access-Control-Allow-Origin', () => {
    const req = new Request('http://x/health', { headers: { Origin: 'http://localhost:8081' } });
    const cors = applyCors(req, config);
    const allow = (cors as Record<string, string>)['Access-Control-Allow-Origin'];
    expect(allow).not.toBe('*');
  });
});
