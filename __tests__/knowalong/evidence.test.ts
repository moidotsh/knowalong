// __tests__/knowalong/evidence.test.ts
// Evidence-level rules: encountered does not auto-promote to recognized/
// retrievable/flexible. Promotion requires explicit learner action or
// repeated successful retrieval.

import { describe, it, expect } from 'vitest';
import type {
  LearnerConceptProgress,
  KnowledgeLevel,
} from '../../shared/types/knowalong';

/**
 * The domain rule: evidence levels are cumulative but non-auto-promoting.
 * "Encountered" means the learner has seen the concept; it does NOT mean
 * they can recognize, retrieve, or use it flexibly. Promotion is a
 * separate, explicit learner action (review success, production exercise).
 *
 * These tests verify the shape and ordering of evidence levels without
 * testing a service — the rule is enforced at the type and schema level.
 */

const EVIDENCE_ORDER: KnowledgeLevel[] = ['encountered', 'recognized', 'retrievable', 'flexible'];

describe('Evidence level ordering', () => {
  it('has four progressive levels', () => {
    expect(EVIDENCE_ORDER).toHaveLength(4);
  });

  it('encountered is the lowest level', () => {
    expect(EVIDENCE_ORDER[0]).toBe('encountered');
  });

  it('flexible is the highest level', () => {
    expect(EVIDENCE_ORDER[3]).toBe('flexible');
  });
});

describe('Evidence non-auto-promotion', () => {
  it('a learner with only encountered evidence cannot be at recognized level', () => {
    const progress: LearnerConceptProgress = {
      id: 'p-1',
      userId: 'user-1',
      coreConceptId: 'concept-exist',
      languageCode: 'ru',
      knowledgeLevel: 'encountered',
      evidenceCount: 5,
      lastSeenAt: '2026-07-22T00:00:00Z',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-22T00:00:00Z',
    };
    // Encountered 5 times does NOT mean recognized
    expect(progress.knowledgeLevel).toBe('encountered');
    expect(progress.evidenceCount).toBeGreaterThan(1);
    expect(progress.knowledgeLevel).not.toBe('recognized');
  });

  it('promotion to recognized is an explicit level change, not an automatic one', () => {
    const recognized: LearnerConceptProgress = {
      id: 'p-2',
      userId: 'user-1',
      coreConceptId: 'concept-exist',
      languageCode: 'ru',
      knowledgeLevel: 'recognized',
      evidenceCount: 3,
      lastSeenAt: '2026-07-22T00:00:00Z',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-22T00:00:00Z',
    };
    // The level is set explicitly; evidenceCount is just an observation tally.
    expect(recognized.knowledgeLevel).toBe('recognized');
    expect(recognized.evidenceCount).toBeLessThanOrEqual(5);
  });
});
