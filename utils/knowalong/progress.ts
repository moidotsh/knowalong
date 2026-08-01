// utils/knowalong/progress.ts
//
// Pure helpers for the song-deck progression model. No store access — the
// screens pass in the completed-lesson id list from lessonProgressStore,
// keeping the engine testable and side-effect-free.
//
// Unlock rule (hard sequential): within a section, lesson i is unlocked
// iff i === 0 OR lesson i-1 is completed. The first lesson of every
// section is always unlocked.

import type { Lesson, SubDeck } from './fixtures/decks';

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
