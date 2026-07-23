// shared/types/knowalong/difficultyBudget.ts
// Difficulty budget for transfer-card validation. A generated_transfer
// card must target at least one known concept and at most one unknown
// concept — otherwise the card is too hard for a learner at their current
// level. This shape is validated by the pure transferPolicyService.

/** Provenance of a target concept on a transfer card. */
export interface DifficultyTarget {
  coreConceptCode: string;
  /** True = the learner has retrievable+ evidence for this concept in this language. */
  isKnown: boolean;
}

/** The budget a transfer card proposal is validated against. */
export interface DifficultyBudget {
  /** Concepts the card targets. */
  targets: DifficultyTarget[];
  /** Maximum number of unknown targets allowed (default 1). */
  maxUnknownTargets: number;
  /** Minimum number of targets required (default 1). */
  minTargets: number;
}
