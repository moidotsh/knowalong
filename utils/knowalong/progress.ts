// utils/knowalong/progress.ts
//
// Pure helpers for the song-deck progression model. No store access — the
// screens pass in the completed-lesson id list from lessonProgressStore,
// keeping the engine testable and side-effect-free.
//
// Unlock rule (hard sequential): within a section, lesson i is unlocked
// iff i === 0 OR lesson i-1 is completed. The first lesson of every
// section is always unlocked.

import { ALL_DECKS, type Deck, type Lesson, type SubDeck } from './fixtures/decks';

export interface Progress {
  done: number;
  total: number;
  pct: number; // 0..100, rounded
}

/** Lesson at `index` within a section is playable iff the prior one is done. */
export function isLessonUnlocked(lessons: Lesson[], index: number, completedIds: readonly string[]): boolean {
  if (index <= 0) return true;
  return completedIds.includes(lessons[index - 1].id);
}

/** How many of a section's lessons are completed. */
export function sectionProgress(lessons: Lesson[], completedIds: readonly string[]): Progress {
  const total = lessons.length;
  const done = lessons.filter((l) => completedIds.includes(l.id)).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Aggregate completion across a song deck's sub-decks (sections). */
export function deckProgress(subDecks: SubDeck[], completedIds: readonly string[]): Progress {
  const total = subDecks.reduce((n, sd) => n + sd.lessons.length, 0);
  const done = subDecks.reduce(
    (n, sd) => n + sd.lessons.filter((l) => completedIds.includes(l.id)).length,
    0,
  );
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** A deck's lessons in display order: flat decks use `lessons`; sub-deck decks
 *  (songs, CLCC) flatten their sections' lessons in order. */
export function deckLessonsInOrder(deck: Deck): Lesson[] {
  return deck.subDecks && deck.subDecks.length > 0
    ? deck.subDecks.flatMap((sd) => sd.lessons)
    : deck.lessons;
}

/** Speakable texts (phrase + each word form) for the first `stepsPerLesson`
 *  steps of the NEXT incomplete lesson in each deck — used to pre-warm audio
 *  on the dashboard so the next lesson a learner opens already has its first
 *  cards cached. Skips decks the learner has fully completed. Capped by
 *  `maxDecks` to bound background synthesis. Pure + side-effect-free. */
export function nextLessonAudioTexts(
  completedIds: readonly string[],
  maxDecks = 5,
  stepsPerLesson = 2,
): string[] {
  const done = new Set(completedIds);
  const texts: string[] = [];
  let used = 0;
  for (const deck of ALL_DECKS) {
    if (used >= maxDecks) break;
    const next = deckLessonsInOrder(deck).find((l) => !done.has(l.id));
    if (!next) continue; // deck fully completed
    used += 1;
    for (const step of next.steps.slice(0, stepsPerLesson)) {
      texts.push(step.surfaceForm);
      for (const w of step.words) texts.push(w.form);
    }
  }
  return texts;
}
