// __tests__/knowalong/songDeck.test.ts
// Phase 4 + 4.1 (ADR) — dynamic song-section lessons. buildSongSectionLessons
// generates one arc per lyric target with cross-target mastery evolution; Phase
// 4.1 made context-wrapping the primary path so NO lesson is a single single-word
// card. These tests pin the Intro plan shape, the no-single-word-lesson hard
// rule, cap-compliance across the plan, narrative order, determinism, and the
// sdyn- resolver.

import { describe, it, expect } from 'vitest';
import {
  buildSongSectionLessons,
  resolveDynamicSongLesson,
  isDynamicSongLessonId,
} from '../../utils/knowalong/songDeck';
import { getSpine } from '../../utils/knowalong/spine';
import { getContext } from '../../utils/knowalong/contextProvider';
import { SVETOFOR_SUBDECKS } from '../../utils/knowalong/fixtures/svetoforFullDeck';
import { SVETOFOR_DECK } from '../../utils/knowalong/fixtures/decks';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { Lesson } from '../../utils/knowalong/fixtures/decks';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();
const context = getContext();
const intro = SVETOFOR_SUBDECKS.find((s) => s.id === 'sv-intro')!;

/** Every lesson in a section plan is cap-compliant against the lesson-start
 *  mastery a real learner has (evolving as words graduate). */
function assertSectionCapClean(lessons: Lesson[], base: MasteryMap): void {
  const m: MasteryMap = { ...base };
  for (const lesson of lessons) {
    assertLessonWithinCap(lesson, m);
    for (const step of lesson.steps) {
      for (const w of step.words) {
        if (classifyWord(m[wordKey(w.form)]) !== 'graduated') m[wordKey(w.form)] = graduated;
      }
    }
  }
}

describe('buildSongSectionLessons — Intro (the worked section)', () => {
  it('empty mastery → a multi-lesson, cap-compliant plan', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine, context);
    expect(lessons.length).toBeGreaterThanOrEqual(4);
    assertSectionCapClean(lessons, {});
  });

  it('Intro NEVER emits a single-card single-word lesson (the worked section is clean)', () => {
    // The Phase 4.1 hard rule holds for the worked section: every target finds a
    // ready context phrase (эй/будто via particle clauses scaffolding the gradient;
    // полетев/фантомом via graduated line-mates). Other sections still carry
    // residuals for verbs/adj/nouns whose only context is a novel line-mate —
    // those await the AI ContextProvider (Phase 6).
    for (const masteryCase of [{}, { я: graduated, вижу: graduated }, { будто: graduated, полетев: graduated }] as MasteryMap[]) {
      const lessons = buildSongSectionLessons(intro, masteryCase, spine, context);
      for (const lesson of lessons) {
        const isSingleSingleWord = lesson.steps.length === 1 && lesson.steps[0].words.length === 1;
        expect(isSingleSingleWord).toBe(false);
      }
    }
  });

  it('полетев is wrapped in a multi-word phrase (the reported bug, fixed)', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine, context);
    const polet = lessons.find((l) => l.id.startsWith('sdyn-sv-intro-3'));
    expect(polet).toBeTruthy();
    // полетев surfaces inside a real phrase (e.g. «будто полетев»), not as a bare word.
    const targetCards = polet!.steps.filter((s) => s.words.some((w) => wordKey(w.form) === 'полетев'));
    expect(targetCards.length).toBeGreaterThan(0);
    for (const c of targetCards) expect(c.words.length).toBeGreaterThanOrEqual(2);
  });

  it('every target surfaces inside a multi-word phrase (not isolated)', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine, context);
    const targetForms = ['эй', 'будто', 'полетев', 'фантомом'];
    for (const form of targetForms) {
      const cards = lessons.flatMap((l) => l.steps).filter((s) => s.words.some((w) => wordKey(w.form) === form));
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.some((c) => c.words.length >= 2)).toBe(true);
    }
  });

  it('targets are taught in narrative order', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine, context);
    const idx = (targetOrd: number) => lessons.findIndex((l) => l.id.startsWith(`sdyn-sv-intro-${targetOrd}`));
    expect(idx(1)).toBeLessThan(idx(2));
    expect(idx(2)).toBeLessThan(idx(3));
    expect(idx(3)).toBeLessThan(idx(4));
  });

  it('a fully-graduated section yields no lessons', () => {
    const allKnown: MasteryMap = {};
    for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.lyricSteps()]) {
      for (const w of step.words) allKnown[wordKey(w.form)] = graduated;
    }
    expect(buildSongSectionLessons(intro, allKnown, spine, context)).toEqual([]);
  });

  it('is deterministic — same mastery yields identical lesson ids + surface forms', () => {
    const a = buildSongSectionLessons(intro, {}, spine, context);
    const b = buildSongSectionLessons(intro, {}, spine, context);
    expect(JSON.stringify(a.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) })))).toBe(
      JSON.stringify(b.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) }))),
    );
  });
});

describe('resolveDynamicSongLesson', () => {
  it('resolves a generated sdyn- id to its lesson + the svetofor deck + owning section', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine, context);
    const target = lessons[0];
    const resolved = resolveDynamicSongLesson(target.id, {}, spine, context);
    expect(resolved).toBeTruthy();
    expect(resolved!.lesson.id).toBe(target.id);
    expect(resolved!.deck.id).toBe(SVETOFOR_DECK.id);
    expect(resolved!.subDeck.id).toBe('sv-intro');
    expect(resolved!.lessons.length).toBe(lessons.length);
  });

  it('returns null for an orphaned sdyn- id', () => {
    expect(resolveDynamicSongLesson('sdyn-sv-intro-99-l1', {}, spine, context)).toBeNull();
  });
});

describe('isDynamicSongLessonId', () => {
  it('true for sdyn- ids, false for static-deck ids', () => {
    expect(isDynamicSongLessonId('sdyn-sv-intro-1-l1')).toBe(true);
    expect(isDynamicSongLessonId('f-1')).toBe(false);
    expect(isDynamicSongLessonId(undefined)).toBe(false);
  });
});
