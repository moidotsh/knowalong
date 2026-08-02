// __tests__/knowalong/arcGenerator.test.ts
// Phase 3 (ADR: mastery-driven-generation-adr.md) — the dynamic arc generator.
// Pins the Phase 3 exit criterion: same target with empty mastery yields a
// LARGE arc; with full prerequisite mastery yields a SMALL arc; every lesson
// passes the Phase 1 concept cap. Also pins R4 monotonic sizing, mode A
// (contextual corpus host) vs mode B (prerequisite pre-teach), R6 companion
// sourcing, determinism, and the mastery-conditional cap invariant.

import { describe, it, expect } from 'vitest';
import { buildArcForTarget } from '../../utils/knowalong/arcGenerator';
import { getSpine } from '../../utils/knowalong/spine';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();

// A target NOT in the gradient/CLCC corpus (a lyric word) → exercises mode B.
const NOVEL_TARGET = { form: 'фантомом', gloss: 'phantom (instr.)', role: 'noun' as const };
// A target IN the gradient corpus → can exercise mode A when its context is known.
const CORPUS_TARGET = { form: 'вижу', gloss: 'see', role: 'verb' as const };

/** Graduate every word in the gradient + CLCC layers (the companion pool). */
function allCompanionsKnown(): MasteryMap {
  const m: MasteryMap = {};
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
    for (const w of step.words) m[wordKey(w.form)] = graduated;
  }
  return m;
}

/** Graduate every companion word EXCEPT `exclude` (so a corpus target is the
 *  sole unknown among its host phrase's words). */
function allCompanionsKnownExcept(exclude: string): MasteryMap {
  const m = allCompanionsKnown();
  delete m[wordKey(exclude)];
  return m;
}

// ── R4 dynamic sizing (the Phase 3 exit criterion) ───────────────────────
describe('buildArcForTarget — R4 dynamic sizing', () => {
  it('empty mastery → a LARGE arc (prerequisites taught first)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'novel-empty' });
    expect(arc.length).toBeGreaterThan(1);
    // 6 companions + the target = 7 concepts → ceil(7/3) = 3 lessons.
    expect(arc.length).toBe(3);
  });

  it('full prerequisite mastery → a SMALL arc (just the target)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'novel-full' });
    expect(arc.length).toBe(1);
    expect(arc[0].steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(true);
  });

  it('shrinks monotonically as mastery grows', () => {
    const large = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'm0' }).length;
    // Graduate the first 3 gradient words (я, вижу, знаю) → 3 companions remain.
    const partial: MasteryMap = { я: graduated, вижу: graduated, знаю: graduated };
    const medium = buildArcForTarget(NOVEL_TARGET, partial, spine, { idPrefix: 'm1' }).length;
    const small = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'm2' }).length;
    expect(large).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(small);
  });
});

// ── R1/R2/R3 cap compliance ──────────────────────────────────────────────
describe('buildArcForTarget — cap compliance', () => {
  it('every lesson in a large arc passes the hard cap (worst case: empty mastery)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'cap' });
    for (const lesson of arc) {
      expect(() => assertLessonWithinCap(lesson, {})).not.toThrow();
    }
  });

  it('mode B cards are single-concept (one word each) — R1 by construction', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'r1' });
    for (const lesson of arc) {
      for (const step of lesson.steps) expect(step.words.length).toBe(1);
    }
  });

  it('the target lands in the LAST lesson of a mode B arc', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'order' });
    const last = arc[arc.length - 1];
    expect(last.steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(true);
    // and no earlier lesson reveals the target
    for (const lesson of arc.slice(0, -1)) {
      expect(lesson.steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(false);
    }
  });
});

// ── Mode A: reuse a contextual corpus phrase ─────────────────────────────
describe('buildArcForTarget — mode A (contextual host)', () => {
  it('uses a multi-word corpus phrase when the target is the sole unknown', () => {
    const mastery = allCompanionsKnownExcept('вижу'); // я known, вижу not
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, { idPrefix: 'ctx' });
    expect(arc.length).toBe(1);
    const card = arc[0].steps[0];
    expect(card.words.length).toBeGreaterThanOrEqual(2); // a real contextual phrase, not a lone word
    expect(card.surfaceForm).toBe('я вижу'); // shortest ready host wins
  });

  it('the host card is cap-compliant against its generation mastery — but would violate R1 against empty mastery (why mode A needs known context)', () => {
    const mastery = allCompanionsKnownExcept('вижу');
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, { idPrefix: 'ctx-cap' });
    expect(() => assertLessonWithinCap(arc[0], mastery)).not.toThrow(); // 1 new (вижу) — clean
    // Against empty mastery the same 2-word card is 2 new → R1 violation. This is
    // the invariant that forces mode A to fire only when context is known.
    expect(() => assertLessonWithinCap(arc[0], {})).toThrow();
  });
});

// ── R6 companion sourcing + determinism + robustness ─────────────────────
describe('buildArcForTarget — companions, determinism, robustness', () => {
  it('mode B companions are sourced from the gradient/CLCC spine (R6)', () => {
    // R6 is a source rule — companions come from the spine majority pool
    // (gradient + CLCC), not from lyric-only words. A companion that also
    // happens to appear in the lyrics (e.g. я) is fine; what matters is that it
    // is a spine word. So assert every non-target companion IS in the spine pool.
    const spineForms = new Set<string>();
    for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
      for (const w of step.words) spineForms.add(wordKey(w.form));
    }
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'r6' });
    for (const lesson of arc) {
      for (const step of lesson.steps) {
        if (step.surfaceForm === NOVEL_TARGET.form) continue; // the target itself is a lyric word
        for (const w of step.words) expect(spineForms.has(wordKey(w.form))).toBe(true);
      }
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

  it('never throws across mastery states, and a graduated target needs no prerequisites', () => {
    expect(() => buildArcForTarget(NOVEL_TARGET, {}, spine, { idPrefix: 'safe' })).not.toThrow();
    expect(() => buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, { idPrefix: 'safe2' })).not.toThrow();
    // Target already graduated + all companions known → nothing to teach.
    const knownWithTarget = { ...allCompanionsKnown(), [wordKey(NOVEL_TARGET.form)]: graduated };
    const arc = buildArcForTarget(NOVEL_TARGET, knownWithTarget, spine, { idPrefix: 'noop' });
    expect(arc).toHaveLength(0);
  });
});
