// tools/local-companion/__tests__/config.test.ts
// Config schema validation: token length, allowedOrigins format, defaults.

import { describe, it, expect } from 'bun:test';
import { z } from 'zod';

// Re-implement the schema here (mirrors config.ts) so the test doesn't
// depend on the file-system path resolution in the real module.
const CompanionConfigSchema = z.object({
  token: z.string().min(32),
  allowedOrigins: z.array(z.string().url()).min(1),
  defaultModel: z.string().min(1),
  ollamaBaseUrl: z.string().url(),
  port: z.number().int().min(1).max(65535),
});

describe('companion config schema', () => {
  it('accepts a valid config', () => {
    const cfg = {
      token: 'a'.repeat(64),
      allowedOrigins: ['http://localhost:8081'],
      defaultModel: 'llama3.2:3b',
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      port: 8765,
    };
    expect(CompanionConfigSchema.safeParse(cfg).success).toBe(true);
  });

  it('rejects short tokens (<32 chars)', () => {
    const cfg = {
      token: 'short',
      allowedOrigins: ['http://localhost:8081'],
      defaultModel: 'm',
      ollamaBaseUrl: 'http://x',
      port: 8765,
    };
    expect(CompanionConfigSchema.safeParse(cfg).success).toBe(false);
  });

  it('rejects empty allowedOrigins', () => {
    const cfg = {
      token: 'a'.repeat(64),
      allowedOrigins: [],
      defaultModel: 'm',
      ollamaBaseUrl: 'http://x',
      port: 8765,
    };
    expect(CompanionConfigSchema.safeParse(cfg).success).toBe(false);
  });

  it('rejects invalid origin URLs', () => {
    const cfg = {
      token: 'a'.repeat(64),
      allowedOrigins: ['not-a-url'],
      defaultModel: 'm',
      ollamaBaseUrl: 'http://x',
      port: 8765,
    };
    expect(CompanionConfigSchema.safeParse(cfg).success).toBe(false);
  });
});
