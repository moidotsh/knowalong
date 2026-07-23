// utils/knowalong/readiness.ts
// Pure readiness calculation. No React, no Supabase, no I/O. The caller
// (readinessService) fetches inputs via repositories, delegates here, and
// persists the snapshot. Versioned so a formula change is visible in
// persisted snapshots (source_readiness_snapshots.version).
//
// Weights (sum to 1.0):
//   RECALL    0.50 — fraction of eligible cards with successful recent reviews.
//   MATURITY  0.25 — fraction of reviewed cards in the 'review'/'young'/'mature' bands.
//   COVERAGE  0.15 — fraction of totalEligibleCards that have a non-'new' state.
//   BURDEN    0.10 — penalty for overdue cards (overdue burden lowers readiness).

import type {
  ReadinessInput,
  ReadinessResult,
  ReadinessComponent,
  ReadinessCard,
} from '../../shared/types/knowalong';

export const CALCULATION_VERSION = 'knowalong-mvp-v1';

export const RECALL_WEIGHT = 0.5;
export const MATURITY_WEIGHT = 0.25;
export const COVERAGE_WEIGHT = 0.15;
export const BURDEN_WEIGHT = 0.1;

const MATURE_STATUSES = new Set(['review', 'young', 'mature']);

/**
 * Pure readiness score. Returns { kind: 'not-assessed' } when there are no
 * eligible source-derived cards. Otherwise returns a weighted score 0–100.
 *
 * The caller MUST filter out generated-transfer cards before calling —
 * generated practice never counts toward readiness (it is practice, not
 * evidence of source mastery).
 */
export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const cards = input.cards;
  if (cards.length === 0) {
    return { kind: 'not-assessed' };
  }

  const nowMs = new Date(input.now).getTime();

  // RECALL: fraction of cards with a successful recent review
  // (repetitions >= 1 and lastReviewedAt within 7 days).
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const recalledCount = cards.filter((c) => {
    if (!c.lastReviewedAt || c.repetitions < 1) return false;
    return nowMs - new Date(c.lastReviewedAt).getTime() <= SEVEN_DAYS_MS;
  }).length;
  const recallRaw = cards.length > 0 ? recalledCount / cards.length : 0;

  // MATURITY: fraction of cards in a mature scheduler band.
  const matureCount = cards.filter((c) => MATURE_STATUSES.has(c.cardStatus)).length;
  const maturityRaw = cards.length > 0 ? matureCount / cards.length : 0;

  // COVERAGE: fraction of totalEligibleCards with a non-'new' state.
  const nonNewCount = cards.filter((c) => c.cardStatus !== 'new').length;
  const coverageRaw = input.totalEligibleCards > 0
    ? Math.min(1, nonNewCount / input.totalEligibleCards)
    : 0;

  // BURDEN: penalty for overdue cards. Overdue = dueAt in the past.
  // raw = 1 - (overdueCount / totalCount), clamped to [0, 1].
  const overdueCount = cards.filter((c) => {
    if (!c.dueAt) return false;
    return new Date(c.dueAt).getTime() <= nowMs;
  }).length;
  const burdenRaw = cards.length > 0 ? 1 - overdueCount / cards.length : 1;

  const recall: ReadinessComponent = {
    code: 'recall',
    label: 'Recent recall',
    weight: RECALL_WEIGHT,
    raw: recallRaw,
    contribution: recallRaw * RECALL_WEIGHT,
  };
  const maturity: ReadinessComponent = {
    code: 'maturity',
    label: 'Card maturity',
    weight: MATURITY_WEIGHT,
    raw: maturityRaw,
    contribution: maturityRaw * MATURITY_WEIGHT,
  };
  const coverage: ReadinessComponent = {
    code: 'coverage',
    label: 'Source coverage',
    weight: COVERAGE_WEIGHT,
    raw: coverageRaw,
    contribution: coverageRaw * COVERAGE_WEIGHT,
  };
  const burden: ReadinessComponent = {
    code: 'burden',
    label: 'Review burden',
    weight: BURDEN_WEIGHT,
    raw: burdenRaw,
    contribution: burdenRaw * BURDEN_WEIGHT,
  };

  const score01 = recall.contribution + maturity.contribution + coverage.contribution + burden.contribution;
  const score = Math.round(score01 * 100);

  return {
    kind: 'score',
    score,
    components: [recall, maturity, coverage, burden],
    version: CALCULATION_VERSION,
  };
}

/** Convenience: filter a mixed card list to source-derived only (excludes generated-transfer). */
export function sourceDerivedOnly(cards: ReadinessCard[]): ReadinessCard[] {
  return cards.filter((c) => !c.generatedContent);
}
