// __tests__/knowalong/songDeck.test.ts
// Phase 4 (ADR: mastery-driven-generation-adr.md) — dynamic song-section lessons.
// Pins buildSongSectionLessons (arc per lyric target + cross-target mastery
// evolution), resolveDynamicSongLesson, and the cap-compliance of the whole
// section plan against evolving lesson-start mastery.

import { describe, it, expect } from 'vitest';
import {
  buildSongSectionLessons,
  resolveDynamicSongLesson,
  isDynamicSongLessonId,
} from '../../utils/knowalong/songDeck';
import { getSpine } from '../../utils/knowalong/spine';
import { SVETOFOR_SUBDECKS } from '../../utils/knowalong/fixtures/svetoforFullDeck';
import { SVETOFOR_DECK } from '../../utils/knowalong/fixtures/decks';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { Lesson } from '../../utils/knowalong/fixtures/decks';

const T = WORD_FADE_THRESHOLD;
const graduated: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const spine = getSpine();
const intro = SVETOFOR_SUBDECKS.find((s) => s.id === 'sv-intro')!;

/** Assert every lesson in a section plan is cap-compliant against the mastery a
 *  real learner has at the START of each lesson (evolving as words graduate). */
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
  it('empty mastery → a multi-lesson, cap-compliant teaching plan', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine);
    expect(lessons.length).toBeGreaterThanOrEqual(4);
    expect(lessons.length).toBeLessThanOrEqual(8);
    assertSectionCapClean(lessons, {});
  });

  it('cross-target evolution: a later target is revealed inside its real lyric line (Mode A)', () => {
    // Intro targets in narrative order: эй, будто, полетев, фантомом. The first
    // target's arc teaches the gradient; cross-target evolution then graduates
    // будто + полетев, so фантомом's arc finds its lyric line "будто полетев
    // фантомом" with фантомом the sole unknown → Mode A reveals it in context.
    const lessons = buildSongSectionLessons(intro, {}, spine);
    const last = lessons[lessons.length - 1];
    expect(last.steps[0].surfaceForm).toBe('будто полетев фантомом');
  });

  it('cross-target evolution: a mid target needs only a single-word card (scaffolding shared, not re-taught)', () => {
    // будто (target 2) — by the time its arc is built, эй's arc already taught
    // the gradient, so будто has no missing prerequisites → one single-word card.
    const lessons = buildSongSectionLessons(intro, {}, spine);
    const budto = lessons.find((l) => l.id.startsWith('sdyn-sv-intro-2'));
    expect(budto).toBeTruthy();
    expect(budto!.steps.length).toBe(1);
    expect(budto!.steps[0].surfaceForm).toBe('будто');
  });

  it('targets are taught in narrative order', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine);
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
    expect(buildSongSectionLessons(intro, allKnown, spine)).toEqual([]);
  });

  it('is deterministic — same mastery yields identical lesson ids + surface forms', () => {
    const a = buildSongSectionLessons(intro, {}, spine);
    const b = buildSongSectionLessons(intro, {}, spine);
    expect(JSON.stringify(a.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) })))).toBe(
      JSON.stringify(b.map((l) => ({ id: l.id, forms: l.steps.map((s) => s.surfaceForm) }))),
    );
  });
});

describe('resolveDynamicSongLesson', () => {
  it('resolves a generated sdyn- id to its lesson + the svetofor deck + owning section', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine);
    const target = lessons[0];
    const resolved = resolveDynamicSongLesson(target.id, {}, spine);
    expect(resolved).toBeTruthy();
    expect(resolved!.lesson.id).toBe(target.id);
    expect(resolved!.deck.id).toBe(SVETOFOR_DECK.id);
    expect(resolved!.subDeck.id).toBe('sv-intro');
    expect(resolved!.lessons.length).toBe(lessons.length);
  });

  it('returns null for an orphaned sdyn- id (target graduated, arc shrank)', () => {
    // No section materialized against empty mastery contains this fabricated id.
    expect(resolveDynamicSongLesson('sdyn-sv-intro-99-l1', {}, spine)).toBeNull();
  });

  it('next-lesson advances within the resolved section', () => {
    const lessons = buildSongSectionLessons(intro, {}, spine);
    const first = lessons[0];
    const resolved = resolveDynamicSongLesson(first.id, {}, spine);
    expect(resolved!.lessons[1].id).toBeTruthy(); // there is a next lesson
  });
});

describe('isDynamicSongLessonId', () => {
  it('true for sdyn- ids, false for static-deck ids', () => {
    expect(isDynamicSongLessonId('sdyn-sv-intro-1-l1')).toBe(true);
    expect(isDynamicSongLessonId('f-1')).toBe(false);
    expect(isDynamicSongLessonId('clcc-foundations-l1')).toBe(false);
    expect(isDynamicSongLessonId(undefined)).toBe(false);
  });
});
