// __tests__/knowalong/arcGenerator.test.ts
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md). Phase 4.1+:
// Mode A (ready host) → Mode B context wrapping (target inside a teachable phrase)
// → DEFER (no card). A teachability filter rejects pure-function-word phrases
// (no content anchor), and targets with no teachable+wrappable context defer
// (acquired via the culminating line in Phase 5) instead of becoming single-word
// cards. The compositional single-word fallback is retired.

import { describe, it, expect } from 'vitest';
import { buildArcForTarget } from '../../utils/knowalong/arcGenerator';
import { getSpine } from '../../utils/knowalong/spine';
import { getContext, type ContextProvider } from '../../utils/knowalong/contextProvider';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { Lesson } from '../../utils/knowalong/fixtures/decks';
import type { WordPart } from '../../utils/knowalong/fixtures/learningItems';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();
const mockContext = getContext();
const noContext: ContextProvider = { contextPhrasesFor: () => [] };

const NOVEL_TARGET = { form: 'фантомом', gloss: 'phantom', role: 'noun' as const }; // in a lyric line, not the gradient
const CORPUS_TARGET = { form: 'вижу', gloss: 'see', role: 'verb' as const }; // in the gradient
const POLETEV = { form: 'полетев', gloss: 'having flown', role: 'verb' as const };

function allCompanionsKnown(): MasteryMap {
  const m: MasteryMap = {};
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) for (const w of step.words) m[wordKey(w.form)] = graduated;
  return m;
}

/** End-to-end R1+R2 proof: every lesson cap-compliant against lesson-start mastery. */
function assertArcCapClean(arc: Lesson[], base: MasteryMap): void {
  const m: MasteryMap = { ...base };
  for (const lesson of arc) {
    assertLessonWithinCap(lesson, m);
    for (const step of lesson.steps) for (const w of step.words) {
      if (classifyWord(m[wordKey(w.form)]) !== 'graduated') m[wordKey(w.form)] = graduated;
    }
  }
}

// ── Mode A: ready contextualizing host ───────────────────────────────────
describe('buildArcForTarget — mode A (ready host)', () => {
  it('uses a multi-word corpus phrase when the target is the sole unknown', () => {
    const m = allCompanionsKnown();
    delete m['вижу']; // я known, вижу not → "я вижу" has exactly one unknown
    const arc = buildArcForTarget(CORPUS_TARGET, m, spine, mockContext, { idPrefix: 'ctx' });
    expect(arc.length).toBe(1);
    expect(arc[0].steps[0].surfaceForm).toBe('я вижу');
    expect(arc[0].steps[0].words.length).toBeGreaterThanOrEqual(2);
  });

  it('the host card is cap-compliant against its mastery — but would violate R1 against empty', () => {
    const m = allCompanionsKnown();
    delete m['вижу'];
    const arc = buildArcForTarget(CORPUS_TARGET, m, spine, mockContext, { idPrefix: 'ctx-cap' });
    expect(() => assertLessonWithinCap(arc[0], m)).not.toThrow();
    expect(() => assertLessonWithinCap(arc[0], {})).toThrow();
  });
});

// ── Mode B: context wrapping ────────────────────────────────────────────
describe('buildArcForTarget — context wrapping', () => {
  it('wraps the target in a ready teachable phrase — never a single-word card', () => {
    // полетев + будто known → «будто полетев» is a ready, teachable (verb) phrase.
    const arc = buildArcForTarget(POLETEV, { будто: graduated }, spine, mockContext, { idPrefix: 'wrap' });
    const targetCards = arc.flatMap((l) => l.steps).filter((s) => s.words.some((w) => wordKey(w.form) === 'полетев'));
    expect(targetCards.length).toBeGreaterThan(0);
    for (const c of targetCards) expect(c.words.length).toBeGreaterThanOrEqual(2);
    assertArcCapClean(arc, { будто: graduated });
  });

  it('a particle wraps via its clause even with empty mastery (scaffolding the gradient)', () => {
    const arc = buildArcForTarget({ form: 'но', gloss: 'but', role: 'particle' }, {}, spine, mockContext, { idPrefix: 'particle' });
    expect(arc.flatMap((l) => l.steps).some((s) => s.surfaceForm.startsWith('но ') && s.words.length >= 2)).toBe(true);
    assertArcCapClean(arc, {});
  });
});

// ── Teachability filter + defer ──────────────────────────────────────────
describe('buildArcForTarget — teachability filter + defer', () => {
  it('defers ([]) when the only context is pure function words (no content anchor)', () => {
    // «будто бы» (particle + particle) — the kind of nonsense card this removes.
    const functionOnly: ContextProvider = {
      contextPhrasesFor: () => [
        { surfaceForm: 'будто бы', meaning: 'as if would', words: [
          { form: 'будто', gloss: 'as if', role: 'particle' },
          { form: 'бы', gloss: 'would', role: 'particle' },
        ] },
      ],
    };
    const arc = buildArcForTarget({ form: 'бы', gloss: 'would', role: 'particle' }, {}, spine, functionOnly, { idPrefix: 'fn' });
    expect(arc).toEqual([]);
  });

  it('defers ([]) when context needs a novel (non-spine) line-mate', () => {
    // фантомом + empty mastery: its lyric windows pair it with полетев (novel, not
    // spine) → not wrappable → defer. (In-section it wraps once line-mates graduate.)
    expect(buildArcForTarget(NOVEL_TARGET, {}, spine, mockContext, { idPrefix: 'novel-empty' })).toEqual([]);
  });

  it('defers ([]) when there is no context at all', () => {
    expect(buildArcForTarget(NOVEL_TARGET, {}, spine, noContext, { idPrefix: 'none' })).toEqual([]);
  });

  it('a graduated target needs no arc', () => {
    const arc = buildArcForTarget(NOVEL_TARGET, { [wordKey(NOVEL_TARGET.form)]: graduated }, spine, mockContext, { idPrefix: 'grad' });
    expect(arc).toEqual([]);
  });
});

// ── Hard rule + determinism ──────────────────────────────────────────────
describe('buildArcForTarget — hard rule + determinism', () => {
  it('never emits a single-card single-word lesson across wrapping scenarios', () => {
    const cases: Array<{ target: WordPart; mastery: MasteryMap }> = [
      { target: POLETEV, mastery: { будто: graduated } },
      { target: { form: 'но', gloss: 'but', role: 'particle' }, mastery: { я: graduated, вижу: graduated } },
      { target: { form: 'но', gloss: 'but', role: 'particle' }, mastery: {} },
    ];
    for (const { target, mastery } of cases) {
      const arc = buildArcForTarget(target, mastery, spine, mockContext, { idPrefix: 'hard' });
      for (const lesson of arc) {
        const isSingleSingleWord = lesson.steps.length === 1 && lesson.steps[0].words.length === 1;
        expect(isSingleSingleWord).toBe(false);
      }
      assertArcCapClean(arc, mastery);
    }
  });

  it('is deterministic — same inputs yield identical arcs', () => {
    const a = buildArcForTarget(POLETEV, { будто: graduated }, spine, mockContext, { idPrefix: 'det' });
    const b = buildArcForTarget(POLETEV, { будто: graduated }, spine, mockContext, { idPrefix: 'det' });
    expect(JSON.stringify(a.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) })))).toBe(
      JSON.stringify(b.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) }))),
    );
  });
});
