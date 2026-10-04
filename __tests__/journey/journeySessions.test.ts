// __tests__/journey/journeySessions.test.ts
//
// Fixture integrity for the one session player (brief §7): every session
// a step references exists, activity data is internally consistent, and
// bounded-review plans rebuild deterministically from their content-
// derived id so an exit/resume re-pins cleanly.

import { describe, it, expect } from 'vitest';
import {
  buildBoundedReviewPlan,
  getSessionPlan,
  resolveSessionPlan,
  REVIEW_SESSION_CAP,
  SESSION_PLANS,
} from '../../utils/journey/sessions';
import {
  getChapterSteps,
  getStep,
  RU_JOURNEY,
} from '../../utils/journey/curriculum';
import type { SessionActivity, SessionPlan } from '../../utils/journey/types';

const SCORED_KINDS = new Set(['meaning-choice', 'phrase-builder']);

function isScored(activity: SessionActivity): boolean {
  return SCORED_KINDS.has(activity.kind);
}

// ── Registry ↔ curriculum consistency ────────────────────────────────────

describe('session registry', () => {
  it('registers every plan referenced by a journey step', () => {
    for (const chapterId of RU_JOURNEY.chapterIds) {
      for (const step of getChapterSteps(chapterId)) {
        for (const planId of step.sessionPlanIds) {
          expect(getSessionPlan(planId), `${planId} must be registered`).not.toBeNull();
        }
      }
    }
  });

  it('points every plan back at a step that lists it', () => {
    for (const plan of Object.values(SESSION_PLANS)) {
      if (!plan.stepId) continue;
      const step = getStep(plan.stepId);
      expect(step, `${plan.id} → ${plan.stepId}`).not.toBeNull();
      expect(step!.sessionPlanIds).toContain(plan.id);
    }
  });

  it('numbers multi-session steps honestly (sequenceIndex ≤ sessionCount)', () => {
    for (const plan of Object.values(SESSION_PLANS)) {
      expect(plan.sequenceIndex).toBeGreaterThanOrEqual(1);
      expect(plan.sequenceIndex).toBeLessThanOrEqual(plan.sessionCount);
      const step = plan.stepId ? getStep(plan.stepId) : null;
      if (step && step.sessionPlanIds.length > 1) {
        expect(plan.sessionCount).toBe(step.sessionPlanIds.length);
      }
    }
  });

  it('gives every plan a non-empty, uniquely-idded activity sequence', () => {
    for (const plan of Object.values(SESSION_PLANS)) {
      expect(plan.activities.length, plan.id).toBeGreaterThan(0);
      const ids = plan.activities.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('opens each step-shaped plan with an encounter or a cold check', () => {
    for (const plan of Object.values(SESSION_PLANS)) {
      if (plan.kind !== 'step') continue;
      // Foundation sessions open by meeting words in the passage;
      // recall sessions deliberately open with an unrevealed check;
      // return-to-source sessions open back inside the passage itself.
      expect(['phrase-reveal', 'meaning-choice', 'passage-return']).toContain(
        plan.activities[0]!.kind,
      );
      expect(plan.activities[plan.activities.length - 1]!.kind, plan.id).toBe('recap');
    }
  });

  it('marks scored activities scored and reflective activities unscored', () => {
    for (const plan of Object.values(SESSION_PLANS)) {
      for (const activity of plan.activities) {
        if (isScored(activity)) {
          expect(activity.unscored, `${plan.id}/${activity.id}`).toBe(false);
        } else {
          expect(activity.unscored, `${plan.id}/${activity.id}`).toBe(true);
        }
      }
    }
  });
});

// ── Activity data integrity ──────────────────────────────────────────────

describe('activity data', () => {
  function planActivityPairs(): [SessionPlan, SessionActivity][] {
    const pairs: [SessionPlan, SessionActivity][] = [];
    for (const plan of Object.values(SESSION_PLANS)) {
      for (const activity of plan.activities) pairs.push([plan, activity]);
    }
    return pairs;
  }

  it('keeps every meaning-choice solvable (correct option among options)', () => {
    for (const [plan, activity] of planActivityPairs()) {
      if (activity.kind !== 'meaning-choice') continue;
      const optionIds = activity.options.map((o) => o.id);
      expect(optionIds).toContain(activity.correctOptionId);
      expect(activity.options.length, `${plan.id}/${activity.id}`).toBeGreaterThanOrEqual(3);
      const texts = activity.options.map((o) => o.text);
      expect(new Set(texts).size, `${plan.id}/${activity.id} duplicate option texts`).toBe(texts.length);
    }
  });

  it('keeps every phrase-builder solvable from its chips', () => {
    for (const [, activity] of planActivityPairs()) {
      if (activity.kind !== 'phrase-builder') continue;
      const placed = activity.chips
        .filter((c) => c.correctPosition !== null)
        .sort((a, b) => (a.correctPosition ?? 0) - (b.correctPosition ?? 0))
        .map((c) => c.text);
      expect(placed).toEqual(activity.answer);
      // Correct positions are unique and exactly 0..answer.length-1;
      // anything else is a distractor, never required by the answer.
      const positions = activity.chips
        .filter((c) => c.correctPosition !== null)
        .map((c) => c.correctPosition as number)
        .sort((a, b) => a - b);
      expect(positions).toEqual(activity.answer.map((_, i) => i));
    }
  });

  it('gives scored activities something to record evidence against', () => {
    for (const [plan, activity] of planActivityPairs()) {
      if (!isScored(activity)) continue;
      if (activity.kind === 'phrase-builder') {
        expect(activity.wordKeys.length, `${plan.id}/${activity.id}`).toBeGreaterThan(0);
      } else if (activity.kind === 'meaning-choice') {
        // Word-level checks carry a wordKey; whole-line comprehension
        // checks carry the line they were asked against.
        const hasWord = Boolean(activity.wordKey);
        const hasLine = Boolean(activity.sourceLineId);
        expect(hasWord || hasLine, `${plan.id}/${activity.id}`).toBe(true);
      }
    }
  });

  it('never scores a recap, reveal, or return to the passage', () => {
    for (const [plan, activity] of planActivityPairs()) {
      if (['recap', 'phrase-reveal', 'passage-return'].includes(activity.kind)) {
        expect(activity.unscored, `${plan.id}/${activity.id}`).toBe(true);
      }
    }
  });
});

// ── Deterministic rebuild of bounded review plans ────────────────────────

describe('bounded review plans', () => {
  it('caps review sessions at five words', () => {
    expect(REVIEW_SESSION_CAP).toBe(5);
    const keys = ['ru:свет', 'ru:вижу', 'ru:я', 'ru:не', 'ru:спит', 'ru:иду', 'ru:домой'];
    const plan = buildBoundedReviewPlan(keys)!;
    const scored = plan.activities.filter((a) => a.kind === 'meaning-choice');
    expect(scored).toHaveLength(5);
  });

  it('returns null with nothing due', () => {
    expect(buildBoundedReviewPlan([])).toBeNull();
  });

  it('dedupes and drops unknown keys honestly', () => {
    const plan = buildBoundedReviewPlan(['ru:свет', 'ru:свет', 'ru:not-a-word'])!;
    const scored = plan.activities.filter((a) => a.kind === 'meaning-choice') as Extract<SessionActivity, { kind: 'meaning-choice' }>[];
    expect(scored.map((a) => a.wordKey)).toEqual(['ru:свет']);
  });

  it('carries its word keys in the id and resolves back to an equal plan', () => {
    const keys = ['ru:свет', 'ru:вижу', 'ru:я'];
    const plan = buildBoundedReviewPlan(keys)!;
    expect(plan.id).toBe(`review-bounded__${keys.join('+')}`);
    const resolved = resolveSessionPlan(plan.id);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(plan.id);
    expect(resolved!.activities.map((a) => a.id)).toEqual(plan.activities.map((a) => a.id));
    // Same answers are correct after a rebuild — resume stays honest.
    expect(
      resolved!.activities.map((a) => (a.kind === 'meaning-choice' ? a.correctOptionId : null)),
    ).toEqual(plan.activities.map((a) => (a.kind === 'meaning-choice' ? a.correctOptionId : null)));
  });

  it('rotates the correct option so it is not always first', () => {
    const keys = ['ru:свет', 'ru:вижу', 'ru:я', 'ru:не', 'ru:спит'];
    const plan = buildBoundedReviewPlan(keys)!;
    const correctSlots = plan.activities
      .filter((a): a is Extract<SessionActivity, { kind: 'meaning-choice' }> => a.kind === 'meaning-choice')
      .map((a) => Number(a.correctOptionId.replace('opt-', '')) - 1);
    expect(correctSlots).toEqual([0, 1, 2, 0, 1]);
  });

  it('resolves registered plans straight from the registry', () => {
    expect(resolveSessionPlan('meet-key-words__s1')?.id).toBe('meet-key-words__s1');
  });

  it('returns null for garbage ids', () => {
    expect(resolveSessionPlan('no-such-plan')).toBeNull();
    expect(resolveSessionPlan('review-bounded__')).toBeNull();
    expect(resolveSessionPlan('review-unknown__ru:свет')).toBeNull();
  });
});
