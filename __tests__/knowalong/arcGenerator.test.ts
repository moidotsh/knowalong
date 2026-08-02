// __tests__/knowalong/arcGenerator.test.ts
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md). Phase 4.1
// made CONTEXT WRAPPING the primary Mode B path (a novel target is wrapped in its
// context phrases — never a single-word lesson); the Phase 3.1 compositional arc
// is now the FALLBACK, used only when a target has no context phrases. These tests
// cover both: the compositional fallback (via a no-op ContextProvider) and the
// context-wrapping primary path (via the mock ContextProvider), plus Mode A, R4
// sizing, R6 sourcing, determinism, and end-to-end cap compliance.

import { describe, it, expect } from 'vitest';
import { buildArcForTarget } from '../../utils/knowalong/arcGenerator';
import { getSpine } from '../../utils/knowalong/spine';
import { getContext, type ContextProvider } from '../../utils/knowalong/contextProvider';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { Lesson } from '../../utils/knowalong/fixtures/decks';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();
/** No context phrases → forces the compositional (Phase 3.1) fallback path. */
const noContext: ContextProvider = { contextPhrasesFor: () => [] };
/** The mock ContextProvider (lyric windows + particle clauses) → the primary path. */
const mockContext = getContext();

// A lyric target NOT in the gradient/CLCC corpus → exercises Mode B.
const NOVEL_TARGET = { form: 'фантомом', gloss: 'phantom (instr.)', role: 'noun' as const };
// A target IN the gradient corpus → exercises Mode A when its context is known.
const CORPUS_TARGET = { form: 'вижу', gloss: 'see', role: 'verb' as const };

/** Graduate every word in the gradient + CLCC layers (the companion pool). */
function allCompanionsKnown(): MasteryMap {
  const m: MasteryMap = {};
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
    for (const w of step.words) m[wordKey(w.form)] = graduated;
  }
  return m;
}

/** End-to-end R1+R2 proof: every lesson cap-compliant against the lesson-start
 *  mastery a real learner has (evolving as words graduate). */
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

// ── Phase 4.1: context wrapping (the primary Mode B path) ────────────────
describe('buildArcForTarget — context wrapping (Phase 4.1)', () => {
  it('wraps the target in a READY multi-word phrase — never a single-word card', () => {
    // фантомом's line-mates будто/полетев are known → a ready lyric window exists,
    // so the target surfaces inside a real phrase with zero scaffolding.
    const mastery: MasteryMap = { будто: graduated, полетев: graduated };
    const arc = buildArcForTarget(NOVEL_TARGET, mastery, spine, mockContext, { idPrefix: 'wrap' });
    const targetCards = arc
      .flatMap((l) => l.steps)
      .filter((s) => s.words.some((w) => wordKey(w.form) === wordKey(NOVEL_TARGET.form)));
    expect(targetCards.length).toBeGreaterThan(0);
    for (const c of targetCards) expect(c.words.length).toBeGreaterThanOrEqual(2); // never a bare single word
  });

  it('a particle wraps even with empty mastery — it scaffolds the gradient clause', () => {
    // но (particle) + empty mastery → «но я вижу» is wrappable (я, вижу are spine
    // atoms), so the arc scaffolds them and reveals но inside the multi-word clause.
    const arc = buildArcForTarget({ form: 'но', gloss: 'but', role: 'particle' }, {}, spine, mockContext, { idPrefix: 'wrap-empty' });
    const cards = arc.flatMap((l) => l.steps);
    expect(cards.some((s) => s.surfaceForm.startsWith('но ') && s.words.length >= 2)).toBe(true);
    assertArcCapClean(arc, {});
  });

  it('a particle target with no ready lyric window gets external particle-clause context', () => {
    // будто (particle) + known gradient → "будто я вижу"-style morphology-safe clause.
    const arc = buildArcForTarget({ form: 'будто', gloss: 'as if', role: 'particle' }, { я: graduated, вижу: graduated }, spine, mockContext, { idPrefix: 'particle' });
    const cards = arc.flatMap((l) => l.steps);
    expect(cards.some((s) => s.surfaceForm.startsWith('будто ') && s.words.length >= 2)).toBe(true);
  });
});

// ── Compositional fallback (Phase 3.1 Mode B, when no context exists) ────
describe('buildArcForTarget — compositional fallback (no context)', () => {
  it('empty mastery → a LARGE arc (prerequisites taught first)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'novel-empty' });
    expect(arc.length).toBeGreaterThan(1);
    expect(arc.length).toBe(3); // 6 gradient companions + target → 3 lessons
  });

  it('full prerequisite mastery → a SMALL arc (just the target)', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, noContext, { idPrefix: 'novel-full' });
    expect(arc.length).toBe(1);
    expect(arc[0].steps.some((s) => s.surfaceForm === NOVEL_TARGET.form)).toBe(true);
  });

  it('pack size is non-increasing as mastery grows; empty is strictly larger than full', () => {
    const empty = buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'r4a' });
    const partial = buildArcForTarget(NOVEL_TARGET, { я: graduated, вижу: graduated, знаю: graduated }, spine, noContext, { idPrefix: 'r4b' });
    const full = buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, noContext, { idPrefix: 'r4c' });
    expect(partial.length).toBeLessThanOrEqual(empty.length);
    expect(full.length).toBeLessThanOrEqual(partial.length);
    expect(empty.length).toBeGreaterThan(full.length);
  });

  it('teaches compositional PHRASES, not decomposed single words', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'comp' });
    expect(arc.flatMap((l) => l.steps).filter((s) => s.words.length >= 2).length).toBeGreaterThan(0);
  });

  it('the target lands in the LAST lesson', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'order' });
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
    const arc = buildArcForTarget(CORPUS_TARGET, {}, spine, noContext, { idPrefix: 'ctx-after' });
    const last = arc[arc.length - 1];
    expect(last.steps.some((s) => s.surfaceForm === 'я вижу')).toBe(true);
    expect(arc[0].steps.map((s) => s.surfaceForm)).toContain('я');
    const taughtWords = new Set(arc.flatMap((l) => l.steps.flatMap((s) => s.words.map((w) => wordKey(w.form)))));
    expect(taughtWords.size).toBeLessThan(5);
  });
});

// ── R1/R2/R3 cap compliance (end-to-end, across mastery states + both paths) ──
describe('buildArcForTarget — cap compliance', () => {
  it('every lesson is cap-compliant against its own lesson-start mastery', () => {
    const cases: MasteryMap[] = [
      {},
      { я: graduated, вижу: graduated },
      { будто: graduated, полетев: graduated },
      allCompanionsKnown(),
    ];
    for (const mastery of cases) {
      assertArcCapClean(buildArcForTarget(NOVEL_TARGET, mastery, spine, mockContext, { idPrefix: 'cap-wrap' }), mastery);
      assertArcCapClean(buildArcForTarget(NOVEL_TARGET, mastery, spine, noContext, { idPrefix: 'cap-fb' }), mastery);
      assertArcCapClean(buildArcForTarget(CORPUS_TARGET, mastery, spine, mockContext, { idPrefix: 'cap-ctx' }), mastery);
    }
  });
});

// ── Mode A: reuse a contextual corpus phrase (no scaffolding needed) ─────
describe('buildArcForTarget — mode A (contextual host, ready immediately)', () => {
  it('uses a multi-word corpus phrase when the target is the sole unknown', () => {
    const mastery = allCompanionsKnown();
    delete mastery['вижу'];
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, mockContext, { idPrefix: 'ctx' });
    expect(arc.length).toBe(1);
    const card = arc[0].steps[0];
    expect(card.words.length).toBeGreaterThanOrEqual(2);
    expect(card.surfaceForm).toBe('я вижу');
  });

  it('the host card is cap-compliant against its generation mastery — but would violate R1 against empty mastery', () => {
    const mastery = allCompanionsKnown();
    delete mastery['вижу'];
    const arc = buildArcForTarget(CORPUS_TARGET, mastery, spine, mockContext, { idPrefix: 'ctx-cap' });
    expect(() => assertLessonWithinCap(arc[0], mastery)).not.toThrow();
    expect(() => assertLessonWithinCap(arc[0], {})).toThrow();
  });
});

// ── Sourcing, determinism, robustness ────────────────────────────────────
describe('buildArcForTarget — sourcing, determinism, robustness', () => {
  it('fallback scaffolding cards are spine phrases — every non-target card word is a gradient/CLCC word (R6)', () => {
    const spineForms = new Set<string>();
    for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) {
      for (const w of step.words) spineForms.add(wordKey(w.form));
    }
    const arc = buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'r6' });
    for (const step of arc.flatMap((l) => l.steps)) {
      if (step.surfaceForm === NOVEL_TARGET.form) continue;
      for (const w of step.words) expect(spineForms.has(wordKey(w.form))).toBe(true);
    }
  });

  it('is deterministic — same inputs yield identical arcs (both paths)', () => {
    const a1 = buildArcForTarget(NOVEL_TARGET, {}, spine, mockContext, { idPrefix: 'det' });
    const a2 = buildArcForTarget(NOVEL_TARGET, {}, spine, mockContext, { idPrefix: 'det' });
    expect(JSON.stringify(a1.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) })))).toBe(
      JSON.stringify(a2.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) }))),
    );
  });

  it('never throws across mastery states, and a graduated target needs no arc', () => {
    expect(() => buildArcForTarget(NOVEL_TARGET, {}, spine, mockContext, { idPrefix: 'safe' })).not.toThrow();
    expect(() => buildArcForTarget(NOVEL_TARGET, allCompanionsKnown(), spine, mockContext, { idPrefix: 'safe2' })).not.toThrow();
    const knownWithTarget = { ...allCompanionsKnown(), [wordKey(NOVEL_TARGET.form)]: graduated };
    const arc = buildArcForTarget(NOVEL_TARGET, knownWithTarget, spine, mockContext, { idPrefix: 'noop' });
    expect(arc).toHaveLength(0);
  });
});
