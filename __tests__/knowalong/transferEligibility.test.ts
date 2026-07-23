// __tests__/knowalong/transferEligibility.test.ts
// Transfer card policy: generated card requires ≥1 target; difficulty budget
// with >1 unknown target rejected.

import { describe, it, expect } from 'vitest';
import { validateTransferCardProposal } from '../../services/transferPolicyService';
import type { DifficultyBudget } from '../../shared/types/knowalong';
import type { AnalysisTransferProposal } from '../../shared/types/knowalong';

function makeBudget(overrides: Partial<DifficultyBudget> = {}): DifficultyBudget {
  return {
    targets: overrides.targets ?? [{ coreConceptCode: 'EXIST', isKnown: true }],
    maxUnknownTargets: overrides.maxUnknownTargets ?? 1,
    minTargets: overrides.minTargets ?? 1,
  };
}

function makeProposal(
  overrides: Partial<AnalysisTransferProposal> = {},
): AnalysisTransferProposal {
  return {
    targetCoreConceptCode: overrides.targetCoreConceptCode ?? 'EXIST',
    targetLemmaIndex: overrides.targetLemmaIndex ?? null,
    prompt: overrides.prompt ?? 'Generated prompt',
    answer: overrides.answer ?? 'Generated answer',
    contextNote: overrides.contextNote ?? null,
  };
}

describe('validateTransferCardProposal', () => {
  it('accepts a card targeting one known concept', () => {
    const budget = makeBudget({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
    });
    const result = validateTransferCardProposal(makeProposal(), budget);
    expect(result.valid).toBe(true);
  });

  it('rejects when budget has fewer targets than minTargets', () => {
    const budget = makeBudget({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
      minTargets: 2,
    });
    const result = validateTransferCardProposal(makeProposal(), budget);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least 2');
  });

  it('rejects when unknown targets exceed maxUnknownTargets', () => {
    const budget = makeBudget({
      targets: [
        { coreConceptCode: 'KNOWN', isKnown: true },
        { coreConceptCode: 'UNK1', isKnown: false },
        { coreConceptCode: 'UNK2', isKnown: false },
      ],
      maxUnknownTargets: 1,
    });
    const result = validateTransferCardProposal(
      makeProposal({ targetCoreConceptCode: 'KNOWN' }),
      budget,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('2 unknown');
  });

  it('accepts exactly one unknown target when maxUnknownTargets=1', () => {
    const budget = makeBudget({
      targets: [
        { coreConceptCode: 'KNOWN', isKnown: true },
        { coreConceptCode: 'UNK', isKnown: false },
      ],
      maxUnknownTargets: 1,
    });
    const result = validateTransferCardProposal(
      makeProposal({ targetCoreConceptCode: 'KNOWN' }),
      budget,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects when proposal does not reference any budget target', () => {
    const budget = makeBudget({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
    });
    // Empty targetCoreConceptCode + null lemmaIndex → no reference.
    const proposal: AnalysisTransferProposal = {
      targetCoreConceptCode: '',
      targetLemmaIndex: null,
      prompt: 'test',
      answer: 'test',
      contextNote: null,
    };
    const result = validateTransferCardProposal(proposal, budget);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('does not reference');
  });

  it('accepts when proposal references a target via lemmaIndex', () => {
    const budget = makeBudget({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
    });
    const proposal = makeProposal({
      targetCoreConceptCode: '',
      targetLemmaIndex: 2,
    });
    const result = validateTransferCardProposal(proposal, budget);
    expect(result.valid).toBe(true);
  });
});
