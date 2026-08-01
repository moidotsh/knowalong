// __tests__/knowalong/concept.test.ts
// Phase 1 (ADR: mastery-driven-generation-adr.md) — the concept cap made
// executable. Pins R1 (≤1 new concept/card), R2 (≤3 new concepts/lesson), and
// R3 (a case/tense variant is a separate concept, because concepts key by
// surface form via wordKey).

import { describe, it, expect } from 'vitest';
import {
  countNewConcepts,
  lessonConcepts,
  newConceptKeys,
  findCapViolations,
  assertLessonWithinCap,
  MAX_NEW_CONCEPTS_PER_CARD,
  MAX_NEW_CONCEPTS_PER_LESSON,
} from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { LessonStep, Lesson } from '../../utils/knowalong/fixtures/decks';

// ── fixtures ─────────────────────────────────────────────────────────────
const T = WORD_FADE_THRESHOLD;
/** A graduated record: streak at/over threshold + at least one exposure. */
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
/** A seen-but-not-graduated record: counts as a burden, NOT known context. */
const learning: WordMastery = { exposures: 3, correct: 2, streak: 2, mistakes: 0, lastSeenMs: 1 };

function step(itemId: string, forms: ReadonlyArray<readonly [string, string]>): LessonStep {
  return {
    itemId,
    surfaceForm: forms.map((f) => f[0]).join(' '),
    meaning: forms.map((f) => f[1]).join(' '),
    words: forms.map(([form, gloss]) => ({ form, gloss, role: 'noun' as const })),
  };
}

function lesson(id: string, steps: ReadonlyArray<LessonStep>): Lesson {
  return { id, title: id, subtitle: '', icon: 'book', steps: [...steps], stepCount: steps.length };
}

// ── concept identity + counting ───────────────────────────────────────────
describe('lessonConcepts + countNewConcepts', () => {
  it('counts every distinct surface form as new when nothing is graduated', () => {
    const s = step('s', [
      ['собака', 'dog'],
      ['дом', 'house'],
    ]);
    expect(countNewConcepts([s], {})).toBe(2);
  });

  it('R3: a case/tense variant is a separate concept (фантом ≠ фантомом)', () => {
    // Two surface forms of the same lemma — must count as TWO concepts, not one.
    const s = step('s', [
      ['фантом', 'phantom (nom.)'],
      ['фантомом', 'phantom (instr.)'],
    ]);
    expect(lessonConcepts([s])).toEqual(['фантом', 'фантомом']);
    expect(countNewConcepts([s], {})).toBe(2);
  });

  it('dedupes a form repeated within a step and across steps', () => {
    const a = step('a', [
      ['собака', 'dog'],
      ['собака', 'dog'],
    ]);
    const b = step('b', [['собака', 'dog']]);
    expect(lessonConcepts([a, b])).toEqual(['собака']);
    expect(countNewConcepts([a, b], {})).toBe(1);
  });

  it('excludes graduated forms; counts learning + never-seen forms as new', () => {
    const mastery: MasteryMap = {
      собака: graduated, // known context — does not count
      кошка: learning, // seen but not graduated — counts as a burden
      // 'я' absent — never seen — counts as new
    };
    const s = step('s', [
      ['собака', 'dog'],
      ['кошка', 'cat'],
      ['я', 'I'],
    ]);
    expect(newConceptKeys([s], mastery)).toEqual(['кошка', 'я']);
    expect(countNewConcepts([s], mastery)).toBe(2);
  });

  it('counts a concept spanning multiple cards once at lesson scope (union, not sum)', () => {
    const a = step('a', [
      ['а', 'a'],
      ['б', 'b'],
    ]);
    const b = step('b', [
      ['а', 'a'],
      ['в', 'c'],
    ]);
    expect(countNewConcepts([a, b], {})).toBe(3); // а, б, в — not 4
  });
});

// ── cap violations ───────────────────────────────────────────────────────
describe('findCapViolations', () => {
  it('R1: flags a card that introduces more than one new concept', () => {
    const l = lesson('l', [
      step('s', [
        ['а', 'a'],
        ['б', 'b'],
      ]),
    ]);
    const v = findCapViolations(l, {});
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('R1');
    expect(v[0].at).toBe('s');
    expect(v[0].count).toBe(2);
    expect(v[0].cap).toBe(MAX_NEW_CONCEPTS_PER_CARD);
  });

  it('R1: a card whose only new concept is the target (rest graduated) is clean', () => {
    const mastery: MasteryMap = { собака: graduated };
    const l = lesson('l', [
      step('s', [
        ['фантом', 'phantom'],
        ['собака', 'dog'],
      ]),
    ]);
    expect(findCapViolations(l, mastery)).toHaveLength(0);
  });

  it('R2: flags a lesson that introduces more than three new concepts across cards', () => {
    // Four cards, each with one distinct new concept — every card passes R1,
    // but the lesson total (4) exceeds R2.
    const l = lesson('l', [
      step('s1', [['а', 'a']]),
      step('s2', [['б', 'b']]),
      step('s3', [['в', 'c']]),
      step('s4', [['г', 'd']]),
    ]);
    const v = findCapViolations(l, {});
    expect(v.some((x) => x.rule === 'R2' && x.at === 'l' && x.count === 4 && x.cap === MAX_NEW_CONCEPTS_PER_LESSON)).toBe(true);
  });

  it('R2: a lesson with at most three new concepts is clean', () => {
    const l = lesson('l', [
      step('s1', [['а', 'a']]),
      step('s2', [['б', 'b']]),
      step('s3', [['в', 'c']]),
    ]);
    expect(findCapViolations(l, {})).toHaveLength(0);
  });

  it('reports both R1 and R2 when both are broken', () => {
    const l = lesson('l', [
      step('s', [
        ['а', 'a'],
        ['б', 'b'],
      ]), // R1: 2 on one card
      step('s2', [['в', 'c']]),
      step('s3', [['г', 'd']]),
      step('s4', [['д', 'e']]),
    ]); // R2: 5 distinct total
    const rules = findCapViolations(l, {}).map((x) => x.rule);
    expect(rules).toContain('R1');
    expect(rules).toContain('R2');
  });
});

// ── hard gate ────────────────────────────────────────────────────────────
describe('assertLessonWithinCap', () => {
  function catchErr(fn: () => void): unknown {
    let caught: unknown = undefined;
    try {
      fn();
    } catch (e) {
      caught = e;
    }
    return caught;
  }

  it('does not throw when the lesson is within cap', () => {
    const mastery: MasteryMap = { собака: graduated };
    const l = lesson('l', [
      step('s', [
        ['фантом', 'phantom'],
        ['собака', 'dog'],
      ]),
    ]);
    expect(() => assertLessonWithinCap(l, mastery)).not.toThrow();
  });

  it('throws a VALIDATION error naming the broken rule when R1 is broken', () => {
    const l = lesson('l', [
      step('s', [
        ['а', 'a'],
        ['б', 'b'],
      ]),
    ]);
    const err = catchErr(() => assertLessonWithinCap(l, {}));
    expect(err).toBeDefined();
    expect((err as { code?: string }).code).toBe('ERR_VALIDATION');
    expect((err as { message?: string }).message).toMatch(/concept cap R1/);
  });

  it('throws a VALIDATION error when R2 is broken', () => {
    const l = lesson('l', [
      step('s1', [['а', 'a']]),
      step('s2', [['б', 'b']]),
      step('s3', [['в', 'c']]),
      step('s4', [['г', 'd']]),
    ]);
    const err = catchErr(() => assertLessonWithinCap(l, {}));
    expect((err as { code?: string }).code).toBe('ERR_VALIDATION');
    expect((err as { message?: string }).message).toMatch(/concept cap R2/);
  });
});
