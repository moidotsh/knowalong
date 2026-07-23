// shared/types/knowalong/readiness.ts
// Readiness calculation types. The pure function in
// `utils/knowalong/readiness.ts` consumes a ReadinessInput and returns a
// ReadinessResult. Versioned so a formula change is visible in persisted
// snapshots (source_readiness_snapshots.version).

/** A single card's contribution to readiness. */
export interface ReadinessCard {
  cardId: string;
  cardStatus: string;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
  /** True = generated_transfer (excluded from readiness input by caller). */
  generatedContent: boolean;
}

/** Input to calculateReadiness. The caller is responsible for filtering out generated-transfer cards. */
export interface ReadinessInput {
  cards: ReadinessCard[];
  /** Total source-derived cards that COULD exist for this source/section (for coverage). */
  totalEligibleCards: number;
  /** "now" injected so the pure function is deterministic in tests. */
  now: string;
}

/** A weighted component in the readiness breakdown. */
export interface ReadinessComponent {
  code: 'recall' | 'maturity' | 'coverage' | 'burden';
  label: string;
  /** Component weight (0–1). Weights sum to 1. */
  weight: number;
  /** Raw component value (0–1). */
  raw: number;
  /** Weighted contribution to the final score (raw * weight, 0–1). */
  contribution: number;
}

/** Discriminated union: not-assessed (no eligible cards) or a scored result. */
export type ReadinessResult =
  | { kind: 'not-assessed' }
  | { kind: 'score'; score: number; components: ReadinessComponent[]; version: string };
