// services/transferPolicyService.ts
// Pure validation for generated-transfer card proposals. Enforces:
//   1. A generated-transfer card MUST target at least one concept/lemma.
//   2. The difficulty budget MUST NOT contain more than maxUnknownTargets
//      unknown targets (default 1). Otherwise the card is too hard for a
//      learner at their current level.
//
// This is pure — no I/O, no React. The analysis pipeline (when wired) will
// call validateTransferCardProposal before persisting any generated-transfer
// card; the UI review flow does not call this directly.

import type { DifficultyBudget, AnalysisTransferProposal } from '../shared/types/knowalong';

export interface TransferValidationResult {
  valid: boolean;
  reason: string | null;
}

/**
 * Validate a transfer card proposal against a difficulty budget.
 * Returns { valid: true } if the card is within budget, or
 * { valid: false, reason } if it violates the ≥1-target or ≤maxUnknown rules.
 */
export function validateTransferCardProposal(
  proposal: Pick<AnalysisTransferProposal, 'targetCoreConceptCode' | 'targetLemmaIndex'>,
  budget: DifficultyBudget,
): TransferValidationResult {
  const targetCount = budget.targets.length;
  if (targetCount < budget.minTargets) {
    return {
      valid: false,
      reason: `Transfer card must target at least ${budget.minTargets} concept(s); got ${targetCount}.`,
    };
  }
  const unknownCount = budget.targets.filter((t) => !t.isKnown).length;
  if (unknownCount > budget.maxUnknownTargets) {
    return {
      valid: false,
      reason: `Transfer card has ${unknownCount} unknown target(s); budget allows at most ${budget.maxUnknownTargets}.`,
    };
  }
  // The proposal must reference at least one of the budget's targets.
  const targetsProposal = proposal.targetCoreConceptCode
    ? budget.targets.some((t) => t.coreConceptCode === proposal.targetCoreConceptCode)
    : proposal.targetLemmaIndex !== null;
  if (!targetsProposal) {
    return {
      valid: false,
      reason: 'Transfer card proposal does not reference any target in the difficulty budget.',
    };
  }
  return { valid: true, reason: null };
}
