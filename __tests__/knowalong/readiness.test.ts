// __tests__/knowalong/readiness.test.ts
// Pure readiness calculation tests. No React, no Supabase, no I/O.

import { describe, it, expect } from 'vitest';
import {
  calculateReadiness,
  sourceDerivedOnly,
  RECALL_WEIGHT,
  MATURITY_WEIGHT,
  COVERAGE_WEIGHT,
  BURDEN_WEIGHT,
  CALCULATION_VERSION,
} from '../../utils/knowalong/readiness';
import type { ReadinessInput, ReadinessCard } from '../../shared/types/knowalong';

const NOW = '2026-07-22T00:00:00.000Z';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<ReadinessCard> = {}): ReadinessCard {
  return {
    cardId: overrides.cardId ?? 'card-1',
    cardStatus: overrides.cardStatus ?? 'new',
    repetitions: overrides.repetitions ?? 0,
    lapses: overrides.lapses ?? 0,
    lastReviewedAt: overrides.lastReviewedAt ?? null,
    dueAt: overrides.dueAt ?? null,
    generatedContent: overrides.generatedContent ?? false,
  };
}

describe('calculateReadiness', () => {
  it('returns not-assessed when there are no eligible cards', () => {
    const input: ReadinessInput = {
      cards: [],
      totalEligibleCards: 0,
      now: NOW,
    };
    const result = calculateReadiness(input);
    expect(result.kind).toBe('not-assessed');
  });

  it('returns a score with version', () => {
    const input: ReadinessInput = {
      cards: [makeCard()],
      totalEligibleCards: 1,
      now: NOW,
    };
    const result = calculateReadiness(input);
    expect(result.kind).toBe('score');
    if (result.kind === 'score') {
      expect(result.version).toBe(CALCULATION_VERSION);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components).toHaveLength(4);
    }
  });

  it('gives a low score when all cards are new with no reviews', () => {
    const input: ReadinessInput = {
      cards: [makeCard(), makeCard({ cardId: 'card-2' })],
      totalEligibleCards: 2,
      now: NOW,
    };
    const result = calculateReadiness(input);
    if (result.kind === 'score') {
      expect(result.score).toBeLessThan(30);
    }
  });

  it('gives a higher score when cards have recent successful reviews', () => {
    const recentIso = new Date(new Date(NOW).getTime() - ONE_DAY_MS).toISOString();
    const input: ReadinessInput = {
      cards: [
        makeCard({
          cardStatus: 'review',
          repetitions: 3,
          lastReviewedAt: recentIso,
        }),
        makeCard({
          cardId: 'card-2',
          cardStatus: 'young',
          repetitions: 2,
          lastReviewedAt: recentIso,
        }),
      ],
      totalEligibleCards: 2,
      now: NOW,
    };
    const result = calculateReadiness(input);
    if (result.kind === 'score') {
      expect(result.score).toBeGreaterThan(50);
    }
  });

  it('lowers score when cards are overdue', () => {
    const pastIso = new Date(new Date(NOW).getTime() - SEVEN_DAYS_MS - ONE_DAY_MS).toISOString();
    const overdueDue = new Date(new Date(NOW).getTime() - ONE_DAY_MS).toISOString();
    const input: ReadinessInput = {
      cards: [
        makeCard({
          cardStatus: 'review',
          repetitions: 3,
          lastReviewedAt: pastIso,
          dueAt: overdueDue,
        }),
      ],
      totalEligibleCards: 1,
      now: NOW,
    };
    const result = calculateReadiness(input);
    if (result.kind === 'score') {
      const burdenComponent = result.components.find((c) => c.code === 'burden');
      expect(burdenComponent?.raw).toBe(0);
    }
  });

  it('weights sum to 1.0', () => {
    const sum = RECALL_WEIGHT + MATURITY_WEIGHT + COVERAGE_WEIGHT + BURDEN_WEIGHT;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('recall component counts only cards reviewed within 7 days with reps >= 1', () => {
    const within7 = new Date(new Date(NOW).getTime() - 3 * ONE_DAY_MS).toISOString();
    const beyond7 = new Date(new Date(NOW).getTime() - SEVEN_DAYS_MS - ONE_DAY_MS).toISOString();
    const input: ReadinessInput = {
      cards: [
        makeCard({ cardId: 'recent', repetitions: 1, lastReviewedAt: within7 }),
        makeCard({ cardId: 'old', repetitions: 5, lastReviewedAt: beyond7 }),
        makeCard({ cardId: 'noreview', repetitions: 0, lastReviewedAt: null }),
      ],
      totalEligibleCards: 3,
      now: NOW,
    };
    const result = calculateReadiness(input);
    if (result.kind === 'score') {
      const recall = result.components.find((c) => c.code === 'recall');
      // Only 1 of 3 cards was recently reviewed
      expect(recall?.raw).toBeCloseTo(1 / 3, 5);
    }
  });
});

describe('sourceDerivedOnly', () => {
  it('filters out generated-transfer cards', () => {
    const cards: ReadinessCard[] = [
      makeCard({ cardId: 'src-1', generatedContent: false }),
      makeCard({ cardId: 'gen-1', generatedContent: true }),
      makeCard({ cardId: 'src-2', generatedContent: false }),
    ];
    const filtered = sourceDerivedOnly(cards);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((c) => !c.generatedContent)).toBe(true);
  });
});
