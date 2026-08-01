// utils/knowalong/concept.ts
//
// Concept-cap enforcement — the hard rules R1–R3 made executable.
// (ADR: _reports/mastery-driven-generation-adr.md, Phase 1.) Pure: no React,
// no store reads, no I/O.
//
// A *concept* is a distinct surface form, keyed by `wordKey` (case-sensitive
// trim — see mastery.ts). R3 — "a case/tense variant is a separate concept" —
// falls out of this keying: `фантом` (nominative) and `фантомом` (instrumental)
// are different surface forms, therefore two concepts. A concept is *new* for a
// learner when it is NOT graduated (`classifyWord !== 'graduated'`); a form in
// the 'learning' or 'issue' state still counts as a burden, not as known context.
//
// This module only counts + validates; it generates nothing. The dynamic
// generator (Phase 3) will call findCapViolations to self-correct and
// assertLessonWithinCap as a hard gate. R1 caps new concepts per CARD at 1
// (i+1); R2 caps new concepts per LESSON at 3 (target 2).

import type { Lesson, LessonStep } from './fixtures/decks';
import { AppError, ErrorCode } from '../errors';
import { classifyWord, wordKey, type MasteryMap } from './mastery';

/** R1 ceiling: new (non-graduated) concepts a single card may introduce. */
export const MAX_NEW_CONCEPTS_PER_CARD = 1;
/** R2 ceiling: new (non-graduated) concepts a whole lesson may introduce. */
export const MAX_NEW_CONCEPTS_PER_LESSON = 3;

/** Which hard rule a cap violation breaks. R3 is structural (the wordKey
 *  keying) and has no runtime violation — it is tested via countNewConcepts. */
export type CapRule = 'R1' | 'R2';

export interface CapViolation {
  rule: CapRule;
  /** Step itemId (R1) or lesson id (R2) the violation is attached to. */
  at: string;
  /** Actual new-concept count at that scope. */
  count: number;
  /** The cap that was exceeded. */
  cap: number;
  /** Offending surface-form keys, for diagnostics. */
  concepts: string[];
}

/** Distinct concept keys (surface forms) a set of steps exercises, deduped by
 *  `wordKey`, in first-appearance order. A form repeated within or across steps
 *  counts once. */
export function lessonConcepts(steps: readonly LessonStep[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const step of steps) {
    for (const w of step.words) {
      const k = wordKey(w.form);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}

/** Count the distinct not-yet-graduated concepts introduced across `steps`.
 *  Pass a single-step array to measure one card (R1) or a lesson's full steps
 *  for the whole lesson (R2). Already-graduated forms are context, not burdens. */
export function countNewConcepts(steps: readonly LessonStep[], mastery: MasteryMap): number {
  let n = 0;
  for (const k of lessonConcepts(steps)) {
    if (classifyWord(mastery[k]) !== 'graduated') n++;
  }
  return n;
}

/** The not-yet-graduated concept keys in `steps` — diagnostics + generator input. */
export function newConceptKeys(steps: readonly LessonStep[], mastery: MasteryMap): string[] {
  return lessonConcepts(steps).filter((k) => classifyWord(mastery[k]) !== 'graduated');
}

/** Every cap violation in a lesson: R1 per card, then R2 over the whole lesson.
 *  Pure, non-throwing — the generator uses this to self-correct before emitting.
 *  A concept appearing in several cards counts once at lesson scope (union). */
export function findCapViolations(lesson: Lesson, mastery: MasteryMap): readonly CapViolation[] {
  const violations: CapViolation[] = [];

  // R1: each card introduces at most MAX_NEW_CONCEPTS_PER_CARD new concept.
  for (const step of lesson.steps) {
    const keys = newConceptKeys([step], mastery);
    if (keys.length > MAX_NEW_CONCEPTS_PER_CARD) {
      violations.push({ rule: 'R1', at: step.itemId, count: keys.length, cap: MAX_NEW_CONCEPTS_PER_CARD, concepts: keys });
    }
  }

  // R2: the whole lesson introduces at most MAX_NEW_CONCEPTS_PER_LESSON new concepts.
  const lessonKeys = newConceptKeys(lesson.steps, mastery);
  if (lessonKeys.length > MAX_NEW_CONCEPTS_PER_LESSON) {
    violations.push({ rule: 'R2', at: lesson.id, count: lessonKeys.length, cap: MAX_NEW_CONCEPTS_PER_LESSON, concepts: lessonKeys });
  }

  return violations;
}

/** Hard gate: throws when the lesson violates R1 or R2. Use on generated output
 *  to make the cap a runtime invariant (and in tests). The dynamic generator
 *  (Phase 3) must never emit a lesson that fails this. */
export function assertLessonWithinCap(lesson: Lesson, mastery: MasteryMap): void {
  const violations = findCapViolations(lesson, mastery);
  if (violations.length === 0) return;
  const first = violations[0];
  throw new AppError(
    `Lesson "${lesson.id}" violates concept cap ${first.rule}: ${first.count} new concept(s) at "${first.at}" (cap ${first.cap})`,
    ErrorCode.VALIDATION_ERROR,
    { details: { lessonId: lesson.id, violations } },
  );
}
