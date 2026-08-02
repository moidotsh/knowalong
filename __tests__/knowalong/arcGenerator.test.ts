// __tests__/knowalong/arcGenerator.test.ts
// Phase 3 + Phase 3.1 (ADR: mastery-driven-generation-adr.md) — the dynamic arc
// generator. Pins the exit criteria: same target with empty mastery yields a
// LARGE arc; with full prerequisite mastery yields a SMALL arc; every lesson
// passes the Phase 1 concept cap. Phase 3.1 adds the compositional invariants:
// mode B teaches the gradient's compositional PHRASES (not decomposed single
// words), a new hub lands in its own lesson before being reused, and a corpus
// target with an unknown prerequisite is revealed IN a contextual phrase (mode A
// after scaffolding). Also pins R4 sizing, mode A (contextual host), R6
// scaffolding sourcing, determinism, and the end-to-end cap across mastery states.

import { describe, it, expect } from 'vitest';
import { buildArcForTarget } from '../../utils/knowalong/arcGenerator';
import { getSpine } from '../../utils/knowalong/spine';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { Lesson } from '../../utils/knowalong/fixtures/decks';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();

// A target NOT in the gradient/CLCC corpus (a lyric word) → exercises mode B,
// and (no corpus phrase contains it) the single-word target fallback.
const NOVEL_TARGET = { form: 'фантомом', gloss: 'phantom (instr.)', role: 'noun' as const };
// A target IN the gradient corpus → can exercise mode A when its context is known,
// or mode-A-after-scaffolding when a prerequisite (я) is still unknown.
const CORPUS_TARGET = { form: 'вижу', gloss: 'see', role: 'verb' as const };

/** Graduate every word in the gradient + CLCC layers (the companion pool). */
function allCompanionsKnown(): MasteryMap {
  const m: MasteryMap = {};
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
    for (const w of step.words) m[wordKey(w.form)] = graduated;
  }
  return m;
}

/** Assert every lesson in an arc is cap-compliant measured against the mastery a
 *  real learner has at the START of each lesson (evolving as words graduate).
 *  This is the end-to-end R1+R2 proof: the generator's own construction invariant
 *  checked the way the runtime gate (assertLessonWithinCap) measures it. */
function assertArcCapClean(arc: Lesson[], base: MasteryMap): void {
  const m: MasteryMap = { ...base };
  for (const lesson of arc) {
    assertLessonWithinCap(lesson, m);
    for (const step of lesson.steps) {
      for (const w of step.words) {
        if (classifyWord(m[wordKey(w.form)]) !== 'graduated') m[wordKey(w.form)] = graduated;
      }
    }
  }
}

// ── R4 dynamic sizing (the Phase 3 exit criterion) ───────────────────────
describe('buildArcForTarget — R4 dynamic sizing', () => {
  it('empty mastery → a LARGE arc (prerequisites taught first)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'novel-empty' });
    expect(arc.length).toBeGreaterThan(1);
    // 6 compositional scaffolding cards + the target = 7 cards; the hub (я) takes
    // its own lesson, the rest batch 3/3 → 3 lessons.
    expect(arc.length).toBe(3);
  });

  it('full prerequisite mastery → a SMALL arc (just the target)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'novel-full' });
    expect(arc.length).toBe(1);
    expect(arc[0].steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(true);
  });

  it('pack size is non-increasing as mastery grows; empty is strictly larger than full', () => {
    const empty = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'r4a' });
    const partial = buildArcForTarget(NOVEL_TARGET, { я: graduated, вижу: graduated, знаю: graduated }, spine, { idPrefix: 'r4b' });
    const full = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'r4c' });
    // v1's fixed companion budget + the rich CLCC pool mean shrinkage concentrates
    // at the full-mastery boundary (finer-grained dynamic sizing lands with the
    // Phase 6 spine); the load never GROWS as mastery grows, and the ends differ.
    expect(partial.length).toBeLessThanOrEqual(empty.length);
    expect(full.length).toBeLessThanOrEqual(partial.length);
    expect(empty.length).toBeGreaterThan(full.length);
  });
});

// ── Phase 3.1: compositional scaffolding (the new mode B shape) ──────────
describe('buildArcForTarget — compositional scaffolding (Phase 3.1)', () => {
  it('teaches compositional PHRASES, not decomposed single words', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'comp' });
    const allCards = arc.flatMap((l) => l.steps);
    const multiWordCards = allCards.filter((s) => s.words.length >= 2);
    // The gradient is compositional — at least one scaffolding card reuses a hub
    // in a multi-word phrase (я вижу / я знаю / …), not bare isolated words.
    expect(multiWordCards.length).toBeGreaterThan(0);
  });

  it('teaches the compositional hub (я) in its own lesson before reusing it', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'hub' });
    // я is the gradient atom. It is new, and the phrase that reuses it (я вижу)
    // shares that new word — so by the frozen-snapshot cap, я cannot share a
    // lesson with я вижу. It lands alone in lesson 1.
    expect(arc[0].steps.map((s) => s.surfaceForm)).toEqual(['я']);
    // A later lesson reuses now-graduated я across multiple verb phrases.
    const reuseLesson = arc.find((l) => l.steps.length >= 2 && l.steps.every((s) => s.words.some((w) => w.form === 'я')));
    expect(reuseLesson).toBeTruthy();
  });

  it('the target lands in the LAST lesson', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'order' });
    const last = arc[arc.length - 1];
    expect(last.steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(true);
    for (const lesson of arc.slice(0, -1)) {
      expect(lesson.steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(false);
    }
  });
});

// ── Mode A after scaffolding: corpus target revealed in context ──────────
describe('buildArcForTarget — mode A after scaffolding (i+1 reveal)', () => {
  it('a corpus target with an unknown prerequisite is revealed IN a contextual phrase', () => {
    // вижу is in "я вижу", but with empty mastery BOTH я and вижу are unknown → no
    // ready host → mode B. Scaffolding teaches я, which unlocks "я вижу" (вижу now
    // the sole unknown) → the retry stops scaffolding and the target card IS the
    // real phrase "я вижу". The learner meets вижу in context, not isolation.
    const arc = buildArcForTarget(CORPUS_TARGET, {}, spine, { idPrefix: 'ctx-after' });
    const last = arc[arc.length - 1];
    expect(last.steps.some((s) => s.surfaceForm === 'я вижу')).toBe(true);
    // and the prerequisite я was taught first
    expect(arc[0].steps.map((s) => s.surfaceForm)).toContain('я');
    // minimal scaffolding — only the prerequisite needed, not the whole budget.
    const taughtWords = new Set(arc.flatMap((l) => l.steps.flatMap((s) => s.words.map((w) => wordKey(w.form)))));
    expect(taughtWords.size).toBeLessThan(5);
  });
});

// ── R1/R2/R3 cap compliance (end-to-end, across mastery states) ──────────
describe('buildArcForTarget — cap compliance', () => {
  it('every lesson is cap-compliant (R1 per card + R2 per lesson) against its own lesson-start mastery', () => {
    const cases: MasteryMap[] = [
      {},
      { я: graduated, вижу: graduated },
      { я: graduated, вижу: graduated, знаю: graduated, хочу: graduated, иду: graduated, живу: graduated },
      allCompanionsKnown(),
    ];
    for (const mastery of cases) {
      assertArcCapClean(buildArcForTarget(NOVEL_TARGET, mastery, spine, { idPrefix: 'cap-novel' }), mastery);
      assertArcCapClean(buildArcForTarget(CORPUS_TARGET, mastery, spine, { idPrefix: 'cap-ctx' }), mastery);
    }
  });
});

// ── Mode A: reuse a contextual corpus phrase (no scaffolding needed) ─────
describe('buildArcForTarget — mode A (contextual host, ready immediately)', () => {
  it('uses a multi-word corpus phrase when the target is the sole unknown', () => {
    const mastery = allCompanionsKnown();
    delete mastery['вижу']; // я known, вижу not → "я вижу" has exactly one unknown
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, { idPrefix: 'ctx' });
    expect(arc.length).toBe(1);
    const card = arc[0].steps[0];
    expect(card.words.length).toBeGreaterThanOrEqual(2); // a real contextual phrase, not a lone word
    expect(card.surfaceForm).toBe('я вижу'); // shortest ready host wins
  });

  it('the host card is cap-compliant against its generation mastery — but would violate R1 against empty mastery (why mode A needs known context)', () => {
    const mastery = allCompanionsKnown();
    delete mastery['вижу'];
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, { idPrefix: 'ctx-cap' });
    expect(() => assertLessonWithinCap(arc[0], mastery)).not.toThrow(); // 1 new (вижу) — clean
    // Against empty mastery the same 2-word card is 2 new → R1 violation. This is
    // the invariant that forces mode A to fire only when context is known.
    expect(() => assertLessonWithinCap(arc[0], {})).toThrow();
  });
});

// ── R6 sourcing + determinism + robustness ───────────────────────────────
describe('buildArcForTarget — sourcing, determinism, robustness', () => {
  it('scaffolding cards are spine phrases — every non-target card word is a gradient/CLCC word (R6)', () => {
    const spineForms = new Set<string>();
    for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
      for (const w of step.words) spineForms.add(wordKey(w.form));
    }
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'r6' });
    for (const step of arc.flatMap((l) => l.steps)) {
      if (step.surfaceForm === NOVEL_TARGET.form) continue; // the target itself is a lyric word
      for (const w of step.words) expect(spineForms.has(wordKey(w.form))).toBe(true);
    }
  });

  it('is deterministic — same inputs yield identical arcs', () => {
    const opts = { idPrefix: 'det' };
    const a = buildArcForTarget(NOVEL_TARGET, {}, spine, opts);
    const b = buildArcForTarget(NOVEL_TARGET, {}, spine, opts);
    expect(JSON.stringify(a.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) })))).toBe(
      JSON.stringify(b.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) }))),
    );
  });

  it('never throws across mastery states, and a graduated target needs no arc', () => {
    expect(() => buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'safe' })).not.toThrow();
    expect(() => buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'safe2' })).not.toThrow();
    // Target already graduated + all companions known → nothing to teach.
    const knownWithTarget = { ...allCompanionsKnown(), [wordKey(NOVEL_TARGET.form)]: graduated };
    const arc = buildArcForTarget(NOVEL_TARGET, knownWithTarget, spine, { idPrefix: 'noop' });
    expect(arc).toHaveLength(0);
  });
});
