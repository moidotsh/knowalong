// utils/knowalong/fixtures/chips.ts
//
// Shared chip-builder for the chip-builder interaction. Both surfaces — the
// adaptive Study screen (app/study.tsx) and the song-lesson player
// (app/lessons/[lessonId].tsx) — build their chip bank from a LessonStep via
// this single helper. Extracted from the lesson player's inline copy so the
// two surfaces stay in sync and so Study can render generated LessonSteps.
//
// A chip carries the Russian `form` + its English `gloss` + a grammatical
// `role` (drives the color accent). Whether the gloss is actually *shown* is
// decided by the caller via shouldShowGloss(mastery[form]) — mastery is
// global by `form` (see utils/knowalong/mastery.ts).

import type { LessonStep } from './decks';
import { LEARNING_ITEMS, type WordRole } from './learningItems';

export interface Chip {
  id: string;
  form: string;
  gloss: string;
  role: WordRole;
  isCorrect: boolean;
  /** Slot index for correct chips; -1 for distractors. */
  correctPosition: number;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build the chip bank for a step: the step's own words (in order) plus a few
 *  distractors drawn from other items' words. Correct + distractors are
 *  returned shuffled, ready to render. */
export function buildChipsForStep(step: LessonStep): Chip[] {
  const targetForms = new Set(step.words.map((w) => w.form));

  const correct: Chip[] = step.words.map((w, i) => ({
    id: `c-${i}`,
    form: w.form,
    gloss: w.gloss,
    role: w.role,
    isCorrect: true,
    correctPosition: i,
  }));

  const pool: Array<{ form: string; gloss: string; role: WordRole }> = [];
  for (const item of LEARNING_ITEMS) {
    for (const w of item.words) {
      if (targetForms.has(w.form)) continue;
      pool.push({ form: w.form, gloss: w.gloss, role: w.role });
    }
  }

  const distractorCount = Math.max(2, 5 - step.words.length);
  const distractors: Chip[] = shuffle(pool)
    .slice(0, distractorCount)
    .map((w, i) => ({ id: `d-${i}`, form: w.form, gloss: w.gloss, role: w.role, isCorrect: false, correctPosition: -1 }));

  return shuffle([...correct, ...distractors]);
}
