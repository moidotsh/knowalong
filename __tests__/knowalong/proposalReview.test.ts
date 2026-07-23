// __tests__/knowalong/proposalReview.test.ts
// Acceptance matrix (Revision 3 deliverable 3). Pure parts: deferredReasonFor
// returns the literal matrix reason for the three deferred kinds and null
// for every single-row-destination kind. The full DB-backed dispatch is
// type-checked at compile time (TS ensures each kind has a dispatch arm);
// the deferred-status short-circuit is the load-bearing pure rule.

import { describe, it, expect } from 'vitest';
import { proposalReviewService } from '../../services/proposalReviewService';
import type { AnalysisProposalKind } from '../../shared/types/knowalong';

const { deferredReasonFor } = proposalReviewService;

describe('acceptance matrix — deferred kinds', () => {
  const deferredKinds: AnalysisProposalKind[] = ['segment', 'token_occurrence', 'realization'];

  it.each(deferredKinds)('returns a literal deferred reason for kind "%s"', (kind) => {
    const reason = deferredReasonFor(kind);
    expect(reason).not.toBeNull();
    expect(typeof reason).toBe('string');
    expect(reason!.length).toBeGreaterThan(20);
  });

  it('returns a reason that mentions deferral for segment', () => {
    expect(deferredReasonFor('segment')).toContain('deferred');
  });

  it('returns a reason that mentions deferral for token_occurrence', () => {
    expect(deferredReasonFor('token_occurrence')).toContain('deferred');
  });

  it('returns a reason that mentions deferral for realization (CLCC promotion deferred)', () => {
    expect(deferredReasonFor('realization')).toContain('deferred');
  });
});

describe('acceptance matrix — single-row destination kinds (not deferred)', () => {
  const singleRowKinds: AnalysisProposalKind[] = [
    'section',
    'line_translation',
    'lemma',
    'form',
    'morphology',
    'grammar_pattern',
    'concept_mapping',
    'card',
  ];

  it.each(singleRowKinds)('returns null for kind "%s" (single-row destination, not deferred)', (kind) => {
    expect(deferredReasonFor(kind)).toBeNull();
  });
});

describe('acceptance matrix — invariant rules (Revision 3)', () => {
  it('does NOT change the deferred-reason set across calls (idempotent)', () => {
    const first = deferredReasonFor('segment');
    const second = deferredReasonFor('segment');
    expect(first).toBe(second);
  });

  it('returns a different reason per deferred kind (no copy-paste overlap)', () => {
    const segment = deferredReasonFor('segment');
    const token = deferredReasonFor('token_occurrence');
    const realization = deferredReasonFor('realization');
    expect(new Set([segment, token, realization]).size).toBe(3);
  });
});
