// __tests__/knowalong/arcGenerator.test.ts
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md). R7: every
// shipped arc lesson has ≥8 context reveal cards (encoding variability) — a
// target with <8 DEFERS (acquired via the culminating line), and an AUTHORED
// target with <8 THROWS (a data gap). Mode A (ready host) now merges as the
// first card of the encoding-variability lesson rather than a 1-card stub. The
// teachability filter rejects only pure-particle phrases (no content or pronoun
// anchor); wrappability still rejects novel line-mates; cap gates every lesson.

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

/** The generator presumes the spine (gradient + CLCC + palette) as known context
 *  (`withSpineBaseline`); mirror that in cap checks. */
function withBaseline(m: MasteryMap): MasteryMap {
  const out: MasteryMap = { ...m };
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.paletteSteps()]) for (const w of step.words) out[wordKey(w.form)] = graduated;
  return out;
}

/** End-to-end R1+R2 proof: every lesson cap-compliant against lesson-start mastery
 *  (which includes the presumed-known spine baseline). */
function assertArcCapClean(arc: Lesson[], base: MasteryMap): void {
  const m: MasteryMap = withBaseline(base);
  for (const lesson of arc) {
    assertLessonWithinCap(lesson, m);
    for (const step of lesson.steps) for (const w of step.words) {
      if (classifyWord(m[wordKey(w.form)]) !== 'graduated') m[wordKey(w.form)] = graduated;
    }
  }
}

// ── Mode A: ready host now merges into the ≥8 encoding-variability lesson ─
describe('buildArcForTarget — mode A (ready host)', () => {
  it('a ready host ALONE (<8 context) defers — ≥8 or defer (no 1-card stub)', () => {
    // вижу: "я вижу" is a ready host (я known, вижу not), but вижу has no ≥8
    // authored/lyric context → it is NOT shipped as a 1-card stub. (Taught via
    // the gradient deck instead.)
    const m = allCompanionsKnown();
    delete m['вижу'];
    const arc = buildArcForTarget(CORPUS_TARGET, m, spine, mockContext, { idPrefix: 'ctx' });
    expect(arc).toEqual([]);
  });

  it('an authored target with palette graduated yields one ≥8-card encoding-variability lesson', () => {
    // полетев with the palette graduated: its authored phrases are i+1-ready (the
    // non-target words are all graduated palette atoms), so they all land in ONE
    // cap-compliant lesson — ≥8 reveal cards, each a multi-word полетев phrase.
    const m: MasteryMap = { будто: graduated };
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget(POLETEV, m, spine, mockContext, { idPrefix: 'host' });
    expect(arc.length).toBeGreaterThan(0);
    const reveals = arc.reduce((n, l) => n + l.steps.filter((s) => s.words.some((w) => wordKey(w.form) === 'полетев')).length, 0);
    expect(reveals).toBeGreaterThanOrEqual(8);
    expect(arc[0].steps[0].words.some((w) => wordKey(w.form) === 'полетев')).toBe(true);
    expect(arc[0].steps[0].words.length).toBeGreaterThanOrEqual(2);
    assertArcCapClean(arc, m);
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

  it('a particle target wraps in its authored phrases against the baseline (no scaffolding)', () => {
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

// ── R7 enforcement: ≥8 or defer/throw ────────────────────────────────────
describe('buildArcForTarget — R7 (≥8 context cards)', () => {
  it('THROWS (data gap) when an authored-served target yields <8 context cards', () => {
    // Palette graduated so the 3 stub phrases are i+1-ready; only 3 → <8 → the
    // authored gate throws R7 (named after the target), rather than silently
    // shipping a stub or deferring.
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const three: ContextProvider = {
      contextPhrasesFor: () => [
        { surfaceForm: 'этот стук', meaning: 'this knock', words: [{ form: 'этот', gloss: 'this', role: 'pronoun' }, { form: 'стук', gloss: 'knock', role: 'noun' }] },
        { surfaceForm: 'мой стук', meaning: 'my knock', words: [{ form: 'мой', gloss: 'my', role: 'pronoun' }, { form: 'стук', gloss: 'knock', role: 'noun' }] },
        { surfaceForm: 'такой стук', meaning: 'such a knock', words: [{ form: 'такой', gloss: 'such', role: 'pronoun' }, { form: 'стук', gloss: 'knock', role: 'noun' }] },
      ],
      hasAuthoredContext: () => true,
    };
    expect(() => buildArcForTarget({ form: 'стук', gloss: 'knock', role: 'noun' }, m, spine, three, { idPrefix: 'r7' })).toThrow(/R7/);
  });

  it('DEFERS ([]) when an UNauthored target yields <8 (mock coverage pending)', () => {
    // Same 3 phrases, but hasAuthoredContext = false → silent defer, no throw.
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const three: ContextProvider = {
      contextPhrasesFor: () => [
        { surfaceForm: 'этот стук', meaning: 'this knock', words: [{ form: 'этот', gloss: 'this', role: 'pronoun' }, { form: 'стук', gloss: 'knock', role: 'noun' }] },
      ],
    };
    expect(buildArcForTarget({ form: 'стук', gloss: 'knock', role: 'noun' }, m, spine, three, { idPrefix: 'defer' })).toEqual([]);
  });
});

// ── R8: interaction-mode variety ─────────────────────────────────────────
describe('buildArcForTarget — R8 (interaction-mode variety)', () => {
  it('an arc assigns ≥2 interaction modes (build/reverse/cloze), never 8× build', () => {
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget(POLETEV, m, spine, mockContext, { idPrefix: 'variety' });
    const modes = new Set(arc.flatMap((l) => l.steps).map((s) => s.mode ?? 'build'));
    expect(modes.size).toBeGreaterThanOrEqual(2);
    expect(modes.has('build')).toBe(true);
    expect(modes.has('reverse')).toBe(true);
    expect(modes.has('cloze')).toBe(true);
  });

  it('cloze cards blank the target and carry clozePrompt/Answer/Meaning', () => {
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget(POLETEV, m, spine, mockContext, { idPrefix: 'cloze' });
    const cloze = arc.flatMap((l) => l.steps).filter((s) => s.mode === 'cloze');
    expect(cloze.length).toBeGreaterThan(0);
    for (const s of cloze) {
      expect(s.clozeAnswer).toBe('полетев'); // the target is what's blanked
      expect(s.clozePrompt).toContain('___'); // the gap replaces the target
      expect(s.clozePrompt).not.toContain('полетев'); // target blanked, not shown
      expect(s.clozeMeaning).toBeTruthy();
    }
  });

  it('consecutive cards never share the same mode', () => {
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget(POLETEV, m, spine, mockContext, { idPrefix: 'order' });
    const steps = arc.flatMap((l) => l.steps);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].mode ?? 'build').not.toBe(steps[i - 1].mode ?? 'build');
    }
  });
});

// ── R9: target-position variety ──────────────────────────────────────────
describe('buildArcForTarget — R9 (target-position variety)', () => {
  const posOf = (s: { words: ReadonlyArray<{ form: string }> }, form: string): string => {
    const i = s.words.findIndex((w) => wordKey(w.form) === form);
    const last = s.words.length - 1;
    return i <= 0 ? 'start' : i >= last ? 'end' : 'mid';
  };

  it('как (re-authored: start/mid/end) ships a lesson spanning ≥2 positions', () => {
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget({ form: 'как', gloss: 'how/like', role: 'particle' }, m, spine, mockContext, { idPrefix: 'pos' });
    const steps = arc.flatMap((l) => l.steps).filter((s) => s.words.some((w) => wordKey(w.form) === 'как'));
    const positions = new Set(steps.map((s) => posOf(s, 'как')));
    expect(positions.size).toBeGreaterThanOrEqual(2);
    expect(positions.has('start')).toBe(true);
    expect(positions.has('end')).toBe(true);
  });

  it('minority positions are spread through the lesson (not clustered)', () => {
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    const arc = buildArcForTarget({ form: 'как', gloss: 'how/like', role: 'particle' }, m, spine, mockContext, { idPrefix: 'spread' });
    const steps = arc.flatMap((l) => l.steps);
    let sameAdj = 0;
    for (let i = 1; i < steps.length; i++) if (posOf(steps[i], 'как') === posOf(steps[i - 1], 'как')) sameAdj++;
    expect(sameAdj).toBeLessThan(steps.length / 2); // majority of adjacent pairs differ
  });

  it('a target whose pool is single-position does NOT fail (graceful — grammar may force it)', () => {
    // полетев's authored phrases all lead (adverbial participle) → one position, no R9 failure.
    const m: MasteryMap = {};
    for (const step of spine.paletteSteps()) for (const w of step.words) m[wordKey(w.form)] = graduated;
    expect(() => buildArcForTarget(POLETEV, m, spine, mockContext, { idPrefix: 'single' })).not.toThrow();
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
