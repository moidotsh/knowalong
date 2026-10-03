// __tests__/knowalong/packLessonSmoke.test.ts
//
// Phase 7 vertical smoke — the learner leg of the intended data path:
// Studio-frozen release bundle → parsePackRelease (hash + language
// verified) → createPackSpine → the app-wide seam (setDefaultSpine) →
// generateAdaptiveLesson / buildArcForTarget under three mastery
// profiles → REAL store callbacks (exposure/correct/lesson-complete)
// → graduation → maintenance. No DB shortcuts: mastery is produced the
// way the lesson player produces it.
//
// Honest gating note (asserted, not hidden): pack content enters the
// generated corpus only after ≥ GRADUATED_FOR_SVETOFOR foundational
// words have graduated — a brand-new learner's lesson is foundational-
// gradient-only BY DESIGN, so the beginner profile asserts the pack
// ladder is staged-but-not-yet-served.

import { afterEach, beforeEach, describe, expect, it, beforeAll } from 'vitest';
import { mock } from 'bun:test';

// The persisted stores reach their zustand persistence adapter
// (stores/storage.ts) on first state access, and Bun cannot parse the
// react-native entry that adapter's native branch loads. Replace the
// adapter with an in-memory implementation BEFORE the stores load so the
// smoke stays hermetic; the localStorage branch the PWA actually ships is
// production behavior and is not what this smoke exercises.
const memoryStorage = new Map<string, string>();
const memoryZustandStorage = {
  getItem: async (key: string): Promise<string | null> => memoryStorage.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.delete(key);
  },
};
mock.module('../../stores/storage', () => ({
  zustandStorage: memoryZustandStorage,
  default: memoryZustandStorage,
}));

import { createPackSpine, parsePackRelease, type ParsedPackRelease } from '../../utils/knowalong/packRelease';
import { createMockSpine, getSpine, setDefaultSpine, type SpineProvider } from '../../utils/knowalong/spine';
import { generateAdaptiveLesson, TARGET_LESSON_SIZE } from '../../utils/knowalong/generateLesson';
import { buildArcForTarget, MIN_ENCODING_VARIABILITY_CARDS, MIN_DISTINCT_MODES } from '../../utils/knowalong/arcGenerator';
import { assertLessonWithinCap, findCapViolations } from '../../utils/knowalong/concept';
import {
  WORD_FADE_THRESHOLD,
  classifyWord,
  phraseReadiness,
  wordKey,
  type MasteryMap,
  type WordMastery,
} from '../../utils/knowalong/mastery';
import type { ContextPhrase, ContextProvider } from '../../utils/knowalong/contextProvider';
import type { WordPart } from '../../utils/knowalong/fixtures/learningItems';
import type { Lesson, LessonStep } from '../../utils/knowalong/fixtures/decks';
import { GOLDEN_BUNDLE_JSON } from './goldenBundle';

// The stores are loaded dynamically in beforeAll so the AsyncStorage mock
// above is registered first (static imports hoist ahead of module code).
type WordMasteryStore = (typeof import('../../stores/wordMasteryStore'))['useWordMasteryStore'];
type LessonProgressStore = (typeof import('../../stores/lessonProgressStore'))['useLessonProgressStore'];
type StreakStore = (typeof import('../../stores/streakStore'))['useStreakStore'];
let useWordMasteryStore: WordMasteryStore;
let useLessonProgressStore: LessonProgressStore;
let useStreakStore: StreakStore;

// ── Fixtures + helpers ────────────────────────────────────────────────

let packSpine: SpineProvider;

beforeAll(async () => {
  ({ useWordMasteryStore } = await import('../../stores/wordMasteryStore'));
  ({ useLessonProgressStore } = await import('../../stores/lessonProgressStore'));
  ({ useStreakStore } = await import('../../stores/streakStore'));
  const parsed: ParsedPackRelease = await parsePackRelease(JSON.parse(GOLDEN_BUNDLE_JSON) as Record<string, unknown>, {
    expectedLanguage: 'ru',
  });
  packSpine = createPackSpine(parsed, createMockSpine('ru'));
});

/** The arc generator's presumed-known spine baseline (mirrors
 *  withSpineBaseline — not exported), for external cap re-checks. */
function baselineFor(mastery: MasteryMap, spine: SpineProvider): MasteryMap {
  const m: MasteryMap = { ...mastery };
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.paletteSteps()]) {
    for (const w of step.words) m[wordKey(w.form)] = graduated();
  }
  return m;
}

function graduated(): WordMastery {
  return { exposures: 1, correct: WORD_FADE_THRESHOLD, streak: WORD_FADE_THRESHOLD, mistakes: 0, lastSeenMs: 1 };
}

/** Graduate every word carried by the given step lists. */
function graduateAllWords(stepLists: readonly (readonly LessonStep[])[]): MasteryMap {
  const m: MasteryMap = {};
  for (const steps of stepLists) for (const s of steps) for (const w of s.words) m[wordKey(w.form)] = graduated();
  return m;
}

function wrapLesson(id: string, steps: LessonStep[]): Lesson {
  return { id, title: id, subtitle: 'smoke', icon: 'sparkles', steps, stepCount: steps.length };
}

/** A ContextProvider stub for the pack target «есть»: multi-word phrases
 *  alternating the target's position (start/end), whose partner words are
 *  all foundational-spine atoms — so under the spine baseline every phrase
 *  is i+1 (the target is the sole new concept). No `hasAuthoredContext`:
 *  a shortfall must DEFER (arc-generator contract), and ≥8 phrases ships. */
function makeStubContext(spine: SpineProvider): ContextProvider {
  const partners: WordPart[] = [];
  const seen = new Set<string>();
  for (const step of spine.foundationalSteps()) {
    for (const w of step.words) {
      const k = wordKey(w.form);
      if (k !== 'есть' && !seen.has(k)) {
        seen.add(k);
        partners.push({ form: w.form, gloss: w.gloss, role: w.role });
      }
    }
    if (partners.length >= 12) break;
  }
  if (partners.length < MIN_ENCODING_VARIABILITY_CARDS) {
    throw new Error(`smoke setup: only ${partners.length} distinct foundational partner words (need ≥${MIN_ENCODING_VARIABILITY_CARDS})`);
  }
  const target: WordPart = { form: 'есть', gloss: 'there is / to be', role: 'noun' };
  const phrases: ContextPhrase[] = partners.map((p, i) => {
    const words: WordPart[] = i % 2 === 0 ? [target, p] : [p, target];
    return {
      surfaceForm: words.map((w) => w.form).join(' '),
      meaning: words.map((w) => w.gloss).join(' '),
      words,
    };
  });
  return { contextPhrasesFor: (t) => (wordKey(t.form) === 'есть' ? phrases : []) };
}

/** Where the target sits in a step (mirrors arcGenerator's position taxonomy). */
function positionOf(step: LessonStep, tKey: string): 'start' | 'mid' | 'end' {
  const idx = step.words.findIndex((w) => wordKey(w.form) === tKey);
  if (idx <= 0) return 'start';
  if (idx >= step.words.length - 1) return 'end';
  return 'mid';
}

// ── Isolation ─────────────────────────────────────────────────────────

beforeEach(() => {
  useWordMasteryStore.setState({ mastery: {} });
  useLessonProgressStore.setState({ completedLessonIds: [] });
  useStreakStore.setState({ conceptsMastered: 0 });
  setDefaultSpine(packSpine);
});

afterEach(() => {
  setDefaultSpine(null); // restore the lazy mock for every other suite
});

// ── The seam ──────────────────────────────────────────────────────────

describe('packLessonSmoke: the activation seam', () => {
  it('pins the pack spine app-wide and clears back to the lazy mock', () => {
    expect(getSpine()).toBe(packSpine); // pinned identity, byte-stable steps
    setDefaultSpine(null);
    const fallback = getSpine();
    expect(fallback).not.toBe(packSpine);
    expect(fallback.languageCode).toBe('ru');
    expect(fallback.conceptSteps().length).not.toBe(3); // the fixture CLCC ladder is back
  });
});

// ── The three mastery profiles ────────────────────────────────────────

describe('packLessonSmoke: adaptive lessons over the pack spine', () => {
  it('beginner: pack ladder staged through the seam, but the lesson stays foundational-only (≥3-graduations gate)', () => {
    const spine = getSpine();
    // The Studio ladder IS staged — three pack steps with Studio ids.
    const ladder = spine.conceptSteps();
    expect(ladder.map((s) => s.itemId)).toEqual(['pack-EXIST/word/есть', 'pack-GO/word/идти', 'pack-WANT/word/хотеть']);
    // …but a brand-new learner's lesson draws only from the gradient.
    const lesson = generateAdaptiveLesson({});
    expect(lesson.length).toBeGreaterThan(0);
    expect(lesson.length).toBeLessThanOrEqual(TARGET_LESSON_SIZE);
    expect(lesson.some((s) => s.itemId.startsWith('pack-'))).toBe(false);
    // Deterministic (pure generator, stable tie-breaks).
    expect(JSON.stringify(generateAdaptiveLesson({}))).toBe(JSON.stringify(lesson));
  });

  it('partial: after the foundational words graduate, Studio steps enter the lesson — with Studio glosses, cap-compliant', () => {
    const mastery = graduateAllWords([getSpine().foundationalSteps(), getSpine().lyricSteps()]);
    const lesson = generateAdaptiveLesson(mastery);
    const packSteps = lesson.filter((s) => s.itemId.startsWith('pack-'));
    // The two introduce slots carry Studio words (есть, идти — corpus order;
    // хотеть waits for the next lesson's introduce budget).
    expect(packSteps.map((s) => s.surfaceForm)).toEqual(['есть', 'идти']);
    // The glosses crossed the repo boundary intact.
    expect(packSteps[0]!.meaning).toBe('there is / to be');
    expect(packSteps[0]!.transliteration).toBe("est'");
    // Hard gate R1/R2 on the shipped lesson.
    const wrapped = wrapLesson('smoke-partial', lesson);
    expect(findCapViolations(wrapped, mastery)).toHaveLength(0);
    expect(() => assertLessonWithinCap(wrapped, mastery)).not.toThrow();
  });
});

// ── The objective, reached through real callbacks ─────────────────────

describe('packLessonSmoke: the pack target graduates through the real callback path', () => {
  it('context arc → exposure/correct callbacks → graduated → maintenance, no re-teach', () => {
    const spine = getSpine();
    const target: WordPart = spine.conceptSteps().find((s) => s.surfaceForm === 'есть')!.words[0]!;
    const context = makeStubContext(spine);

    // The arc: ONE cap-compliant lesson revealing есть in ≥8 distinct
    // contexts (R7), across ≥2 interaction modes (R8) and ≥2 target
    // positions (R9).
    const arc = buildArcForTarget(target, {}, spine, context, { idPrefix: 'smoke' });
    expect(arc).toHaveLength(1);
    const lesson = arc[0]!;
    const reveals = lesson.steps.filter((s) => s.words.some((w) => wordKey(w.form) === 'есть')).length;
    expect(reveals).toBeGreaterThanOrEqual(MIN_ENCODING_VARIABILITY_CARDS);
    const modes = new Set(lesson.steps.map((s) => s.mode ?? 'build'));
    expect(modes.size).toBeGreaterThanOrEqual(MIN_DISTINCT_MODES);
    const positions = new Set(lesson.steps.map((s) => positionOf(s, 'есть')));
    expect(positions.size).toBeGreaterThanOrEqual(2);
    expect(() => assertLessonWithinCap(lesson, baselineFor({}, spine))).not.toThrow();

    // The learner plays it: REAL store callbacks, once per step (the same
    // stream the lesson player fires — no DB graduation shortcut).
    for (const step of lesson.steps) {
      useWordMasteryStore.getState().recordExposure(step.words.map((w) => w.form));
      useWordMasteryStore.getState().recordCorrect('есть');
    }
    const afterArc = useWordMasteryStore.getState().mastery;
    expect(classifyWord(afterArc['есть'])).toBe('graduated');
    expect(afterArc['есть']!.streak).toBeGreaterThanOrEqual(WORD_FADE_THRESHOLD);
    expect(afterArc['есть']!.exposures).toBeGreaterThanOrEqual(reveals);

    // Lesson completion + mastered-concept telemetry, as the final
    // continue-button fires them (idempotent on double-tap).
    useLessonProgressStore.getState().markLessonComplete(lesson.id);
    useStreakStore.getState().addMasteredConcept();
    expect(useLessonProgressStore.getState().isLessonComplete(lesson.id)).toBe(true);
    expect(useLessonProgressStore.getState().completedLessonIds).toHaveLength(1);
    useLessonProgressStore.getState().markLessonComplete(lesson.id);
    expect(useLessonProgressStore.getState().completedLessonIds).toHaveLength(1);
    expect(useStreakStore.getState().conceptsMastered).toBe(1);

    // The other two pack words graduate through their own arcs (the same
    // correct-placement stream their players would fire).
    for (const form of ['идти', 'хотеть']) {
      useWordMasteryStore.getState().recordExposure([form]);
      for (let i = 0; i < WORD_FADE_THRESHOLD; i++) useWordMasteryStore.getState().recordCorrect(form);
    }
    const realMastery = useWordMasteryStore.getState().mastery;

    // A graduated target is not re-taught: the arc generator defers.
    expect(buildArcForTarget(target, realMastery, spine, context, { idPrefix: 'smoke2' })).toEqual([]);

    // Complete the journey: every remaining corpus word graduates through
    // the SAME real callback stream — the prepared profile, built by play,
    // not by hand-writing a mastery map.
    const corpusForms = new Set<string>();
    for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.lyricSteps()]) {
      for (const w of step.words) corpusForms.add(wordKey(w.form));
    }
    for (const form of corpusForms) {
      useWordMasteryStore.getState().recordExposure([form]);
      for (let i = 0; i < WORD_FADE_THRESHOLD; i++) useWordMasteryStore.getState().recordCorrect(form);
    }
    const prepared = useWordMasteryStore.getState().mastery;

    // Every pack step is fully known — pure maintenance material now.
    for (const step of spine.conceptSteps()) {
      expect(phraseReadiness(step, prepared).unknownCount).toBe(0);
    }
    // The generator serves a non-empty, fully-known, cap-compliant review.
    const maintenance = generateAdaptiveLesson(prepared);
    expect(maintenance.length).toBeGreaterThan(0);
    for (const step of maintenance) {
      expect(phraseReadiness(step, prepared).unknownCount).toBe(0);
    }
    expect(() => assertLessonWithinCap(wrapLesson('smoke-maintenance', maintenance), prepared)).not.toThrow();
  });
});
