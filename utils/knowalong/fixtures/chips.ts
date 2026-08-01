// utils/knowalong/fixtures/chips.ts
//
// Shared chip-builder for the chip-builder interaction. Both surfaces — the
// adaptive Study screen (app/study.tsx) and the lesson player
// (app/lessons/[lessonId].tsx), via the shared LessonRound — build their chip
// bank from a LessonStep through this single helper.
//
// Mode-aware (step.mode, default 'build'):
//  - build:   EN `meaning` is the prompt; chips are the step's RU words (in
//             order) + RU distractors from the shared word pool.
//  - reverse: RU `surfaceForm` is the prompt; chips are the EN tokens of
//             `meaning` (in order) + EN-gloss distractors. Decoding practice.
//  - cloze:   a single-tap fill-in-the-blank — one correct chip (the
//             semantically-fitting verb) + same-role distractors that don't fit.
//
// A chip carries a surface `form` + a grammatical `role` (drives the color
// accent). Whether a build-mode chip's English gloss is shown is decided by the
// caller via shouldShowGloss(mastery[form]) — mastery is global by RU `form`.

import type { LessonStep } from './decks';
import { LEARNING_ITEMS, type WordRole } from './learningItems';
import { ALL_SVETOFOR_LESSONS } from './svetoforFullDeck';
import { ALL_CLCC_STEPS } from './clccDeck';

export interface Chip {
  id: string;
  form: string;
  gloss: string;
  role: WordRole;
  isCorrect: boolean;
  /** Slot index for correct chips (build/reverse); -1 for distractors + cloze. */
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

// ── Shared word pool ───────────────────────────────────────────────────
// Every word the learner can meet: the gradient (LEARNING_ITEMS), the CLCC
// ladder, and the Svetofor lyrics. Deduped by RU form. Memoized.

export interface PoolWord {
  form: string;
  gloss: string;
  role: WordRole;
}

let POOL_CACHE: PoolWord[] | null = null;

export function getWordPool(): PoolWord[] {
  if (POOL_CACHE) return POOL_CACHE;
  const map = new Map<string, PoolWord>();
  const add = (w: PoolWord) => {
    const k = w.form.trim();
    if (k && !map.has(k)) map.set(k, { form: k, gloss: w.gloss, role: w.role });
  };
  for (const item of LEARNING_ITEMS) for (const w of item.words) add({ form: w.form, gloss: w.gloss, role: w.role });
  for (const step of ALL_CLCC_STEPS) for (const w of step.words) add({ form: w.form, gloss: w.gloss, role: w.role });
  for (const lesson of ALL_SVETOFOR_LESSONS) for (const step of lesson.steps) for (const w of step.words) add({ form: w.form, gloss: w.gloss, role: w.role });
  POOL_CACHE = [...map.values()];
  return POOL_CACHE;
}

/** Single-word English glosses from the pool — reverse-mode distractor source. */
function enGlossPool(): string[] {
  const set = new Set<string>();
  for (const w of getWordPool()) {
    const g = w.gloss.trim().toLowerCase();
    if (g && !g.includes(' ')) set.add(g);
  }
  return [...set];
}

/** Split an English string into ordered, lowercased word tokens (internal
 *  apostrophes preserved, surrounding punctuation stripped). */
function tokenizeEn(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''))
    .filter(Boolean);
}

/** Best-effort role for an English token: the role of the RU word whose gloss
 *  matches it, else 'particle'. Gives build-style coloring on reverse chips. */
function roleForEnToken(token: string, step: LessonStep): WordRole {
  const t = token.toLowerCase();
  const hit = step.words.find((w) => w.gloss.trim().toLowerCase() === t || w.gloss.trim().toLowerCase().startsWith(t));
  return hit?.role ?? 'particle';
}

// ── Per-mode builders ──────────────────────────────────────────────────

function buildBuildChips(step: LessonStep): Chip[] {
  const targetForms = new Set(step.words.map((w) => w.form));
  const correct: Chip[] = step.words.map((w, i) => ({
    id: `c-${i}`, form: w.form, gloss: w.gloss, role: w.role, isCorrect: true, correctPosition: i,
  }));
  const distractorCount = Math.max(2, 5 - step.words.length);
  const distractors: Chip[] = shuffle(getWordPool().filter((w) => !targetForms.has(w.form)))
    .slice(0, distractorCount)
    .map((w, i) => ({ id: `d-${i}`, form: w.form, gloss: w.gloss, role: w.role, isCorrect: false, correctPosition: -1 }));
  return shuffle([...correct, ...distractors]);
}

function buildReverseChips(step: LessonStep): Chip[] {
  const tokens = tokenizeEn(step.meaning);
  const target = new Set(tokens);
  const correct: Chip[] = tokens.map((tok, i) => ({
    id: `c-${i}`, form: tok, gloss: '', role: roleForEnToken(tok, step), isCorrect: true, correctPosition: i,
  }));
  const distractorCount = Math.max(2, 5 - tokens.length);
  const distractors: Chip[] = shuffle(enGlossPool().filter((g) => !target.has(g)))
    .slice(0, distractorCount)
    .map((g, i) => ({ id: `d-${i}`, form: g, gloss: '', role: 'particle', isCorrect: false, correctPosition: -1 }));
  return shuffle([...correct, ...distractors]);
}

function buildClozeChips(step: LessonStep): Chip[] {
  const answer = step.clozeAnswer ?? '';
  const role =
    step.words.find((w) => w.form === answer)?.role ??
    step.words.find((w) => w.role === 'verb')?.role ??
    'verb';
  const correct: Chip = { id: 'c-0', form: answer, gloss: '', role, isCorrect: true, correctPosition: -1 };
  const distractors: Chip[] = shuffle(getWordPool().filter((w) => w.role === role && w.form !== answer))
    .slice(0, Math.max(2, 4))
    .map((w, i) => ({ id: `d-${i}`, form: w.form, gloss: '', role: w.role, isCorrect: false, correctPosition: -1 }));
  return shuffle([correct, ...distractors]);
}

/** Build the chip bank for a step, branching on step.mode (default 'build'). */
export function buildChipsForStep(step: LessonStep): Chip[] {
  const mode = step.mode ?? 'build';
  if (mode === 'cloze') return buildClozeChips(step);
  if (mode === 'reverse') return buildReverseChips(step);
  return buildBuildChips(step);
}
