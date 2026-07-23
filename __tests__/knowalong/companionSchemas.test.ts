// __tests__/knowalong/companionSchemas.test.ts
// Zod schema validation: companion request schemas + per-kind proposal
// payload schemas. Pure (no I/O, no mocks).

import { describe, it, expect } from 'vitest';
import {
  CompanionSourceAnalysisRequestSchema,
  CompanionClccGenerationRequestSchema,
} from '../../shared/types/knowalong/schemas';

describe('CompanionSourceAnalysisRequestSchema', () => {
  it('accepts a valid source-analysis request', () => {
    const result = CompanionSourceAnalysisRequestSchema.safeParse({
      sourceId: 'src-1',
      targetLanguageCode: 'ru',
      translationLanguageCode: 'en',
      sourceContentChecksum: 'a'.repeat(64),
      sourceLineCount: 12,
      sourceLines: [{ ordinal: 1, rawText: 'привет' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a checksum shorter than the minimum length', () => {
    const result = CompanionSourceAnalysisRequestSchema.safeParse({
      sourceId: 'src-1',
      targetLanguageCode: 'ru',
      translationLanguageCode: 'en',
      sourceContentChecksum: 'short', // < min(8)
      sourceLineCount: 1,
      sourceLines: [{ ordinal: 1, rawText: 'x' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty sourceLines array', () => {
    const result = CompanionSourceAnalysisRequestSchema.safeParse({
      sourceId: 'src-1',
      targetLanguageCode: 'ru',
      translationLanguageCode: 'en',
      sourceContentChecksum: 'a'.repeat(64),
      sourceLineCount: 0,
      sourceLines: [],
    });
    expect(result.success).toBe(false);
  });

  it('does NOT restrict targetLanguageCode to fr/ru/fa (source may be any learner language)', () => {
    const result = CompanionSourceAnalysisRequestSchema.safeParse({
      sourceId: 'src-1',
      targetLanguageCode: 'de', // German is a valid learner target; only CLCC is fr/ru/fa-scoped
      translationLanguageCode: 'en',
      sourceContentChecksum: 'a'.repeat(64),
      sourceLineCount: 1,
      sourceLines: [{ ordinal: 1, rawText: 'hallo' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('CompanionClccGenerationRequestSchema', () => {
  it('accepts a valid CLCC generation request for an in-scope language', () => {
    const result = CompanionClccGenerationRequestSchema.safeParse({
      targetLanguageCode: 'fr',
      coreConceptCodes: ['EXIST', 'WANT'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects Swedish (not in this checkpoint scope)', () => {
    const result = CompanionClccGenerationRequestSchema.safeParse({
      targetLanguageCode: 'sv',
      coreConceptCodes: ['EXIST'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty coreConceptCodes array', () => {
    const result = CompanionClccGenerationRequestSchema.safeParse({
      targetLanguageCode: 'fa',
      coreConceptCodes: [],
    });
    expect(result.success).toBe(false);
  });
});
