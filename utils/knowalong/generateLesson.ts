// utils/knowalong/generateLesson.ts
//
// Adaptive lesson generator — the engine behind the Study screen. Given the
// learner's per-word mastery, it assembles a balanced lesson:
//
//   warmup (known) → drill (issue words) → introduce (1 new word, i+1) →
//   consolidate (fill with the next-most-learnable phrases)
//
// The corpus is the full phrase set: the LEARNING_ITEMS gradient + every
// Svetofor lyric-phrase step (those steps already decompose lyric phrases
// into words with glosses — they ARE the "CLCC + lyrics" content). Pure +
// deterministic (stable corpus-order tie-breaks; no Math.random) so it is
// fully testable. Never throws — falls back to the gradient.

import {
  WORD_FADE_THRESHOLD,
  classifyWord,
  phraseReadiness,
  wordKey,
  type MasteryMap,
} from './mastery';
import type { LessonStep, StepMode } from './fixtures/decks';
import { LEARNING_ITEMS, type LearningItem } from './fixtures/learningItems';
import { ALL_SVETOFOR_LESSONS } from './fixtures/svetoforFullDeck';
import { ALL_CLCC_STEPS } from './fixtures/clccDeck';

// ── Tuning constants ────────────────────────────────────────────────────
/** Phrases per generated lesson. */
export const TARGET_LESSON_SIZE = 6;
/** Fully-known phrases to ease in at the start. */
export const WARMUP_COUNT = 2;
/** Issue words drilled per lesson. */
export const ISSUE_TARGET_COUNT = 2;
/** Brand-new words introduced per lesson (i+1 ceiling). */
export const NEW_TARGET_COUNT_MAX = 2;
/** A single introduction step carries at most this many unknown words. */
export const NEW_PER_STEP_MAX = 1;
/** Svetofor lyric phrases are admitted only after this many base words have
 *  graduated — keeps brand-new learners on the foundational gradient. */
export const GRADUATED_FOR_SVETOFOR = 3;
/** When every relevant word is graduated, review this many for maintenance. */
export const MAINTENANCE_SIZE = 5;

export interface GenerateOptions {
  /** Override TARGET_LESSON_SIZE (e.g. for tests). */
  size?: number;
}

// ── Corpus ──────────────────────────────────────────────────────────────

/** Map a LearningItem to the unified LessonStep shape (mirrors decks.ts
 *  lessonFromItems, but per-step rather than per-lesson). */
export function stepFromLearningItem(item: LearningItem): LessonStep {
  return {
    itemId: item.id,
    surfaceForm: item.surfaceForm,
    meaning: item.meaning,
    transliteration: item.transliteration,
    emoji: item.emoji,
    words: item.words,
    construction: item.construction,
    contextSentence: item.contextSentence,
    note: item.note,
  };
}

/** The foundational gradient as steps. */
export function baseSteps(): LessonStep[] {
  return LEARNING_ITEMS.map(stepFromLearningItem);
}

/** Every Svetofor lyric-phrase step, flattened across all sub-decks. */
export function svetoforSteps(): LessonStep[] {
  return ALL_SVETOFOR_LESSONS.flatMap((l) => l.steps);
}

/** Every CLCC concept step, flattened across the tier sub-decks. */
export function clccSteps(): LessonStep[] {
  return [...ALL_CLCC_STEPS];
}

/** Choose a play mode for a generated step at `position` in the lesson.
 *  Declared modes (authored CLCC steps) win; otherwise cloze when the step
 *  carries cloze data, reverse occasionally for multi-word phrases, else
 *  build. Deterministic (no Math.random) so tests stay stable. */
export function pickMode(step: LessonStep, position: number): StepMode {
  if (step.mode) return step.mode;
  if (step.clozePrompt) return 'cloze';
  if (step.words.length >= 2 && position % 4 === 3) return 'reverse';
  return 'build';
}

/** Dedupe a step list by surfaceForm (first occurrence wins — the gradient
 *  is authored before the denser lyric phrases). Pure. */
function dedupeBySurface(steps: LessonStep[]): LessonStep[] {
  const seen = new Set<string>();
  const out: LessonStep[] = [];
  for (const s of steps) {
    if (seen.has(s.surfaceForm)) continue;
    seen.add(s.surfaceForm);
    out.push(s);
  }
  return out;
}

/** The full phrase corpus (gradient + CLCC + lyrics), deduped. Exported for
 *  the mastery summary + tests. */
export function buildCorpus(): LessonStep[] {
  return dedupeBySurface([...baseSteps(), ...clccSteps(), ...svetoforSteps()]);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function countGraduated(mastery: MasteryMap): number {
  let n = 0;
  for (const k of Object.keys(mastery)) {
    if ((mastery[k]?.streak ?? 0) >= WORD_FADE_THRESHOLD) n++;
  }
  return n;
}

interface Scored {
  step: LessonStep;
  unknownCount: number;
  issueCount: number;
  knownRatio: number;
}

/** Oldest lastSeenMs among a step's words (null/never → Infinity, so
 *  never-seen words sort after stale seen ones). */
function minLastSeen(step: LessonStep, mastery: MasteryMap): number {
  let oldest = Infinity;
  for (const w of step.words) {
    const t = mastery[wordKey(w.form)]?.lastSeenMs ?? Infinity;
    if (t < oldest) oldest = t;
  }
  return oldest;
}

// ── Generator ───────────────────────────────────────────────────────────

/**
 * Assemble a balanced adaptive lesson from current mastery. Deterministic.
 *
 * Order: warmup → drill → introduce → consolidate. Brand-new learners get the
 * foundational gradient (the i+1 ceiling + difficulty fill produce it
 * naturally); learners with mistakes get those words drilled; fully-caught-up
 * learners get a stale-first maintenance review.
 */
export function generateAdaptiveLesson(mastery: MasteryMap, opts: GenerateOptions = {}): LessonStep[] {
  const target = opts.size ?? TARGET_LESSON_SIZE;

  // Until the learner has graduated a few gradient words, keep the dense
  // lyric phrases out — they'd present too many unknown words at once.
  const corpus =
    countGraduated(mastery) >= GRADUATED_FOR_SVETOFOR
      ? buildCorpus()
      : dedupeBySurface(baseSteps());

  const scored: Scored[] = corpus.map((step) => {
    const r = phraseReadiness(step, mastery);
    return { step, unknownCount: r.unknownCount, issueCount: r.issueCount, knownRatio: r.knownRatio };
  });

  const picked = new Set<string>();
  const add = (step: LessonStep | null | undefined): step is LessonStep => {
    if (!step || picked.has(step.itemId)) return false;
    picked.add(step.itemId);
    return true;
  };

  // 1) Warmup — fully-known phrases, shortest first.
  const warmup: LessonStep[] = [];
  for (const s of scored
    .filter((s) => s.unknownCount === 0 && s.issueCount === 0)
    .sort((a, b) => a.step.words.length - b.step.words.length)) {
    if (warmup.length >= WARMUP_COUNT) break;
    if (add(s.step)) warmup.push(s.step);
  }

  // 2) Drill — the learner's worst issue words (mistakes desc, streak asc).
  const issueForms = Object.keys(mastery)
    .filter((k) => {
      const m = mastery[k];
      return m && m.exposures > 0 && m.mistakes > 0 && m.streak < WORD_FADE_THRESHOLD;
    })
    .sort((a, b) => {
      const ma = mastery[a];
      const mb = mastery[b];
      return mb!.mistakes - ma!.mistakes || ma!.streak - mb!.streak || (ma!.lastSeenMs ?? 0) - (mb!.lastSeenMs ?? 0);
    })
    .slice(0, ISSUE_TARGET_COUNT);

  const drill: LessonStep[] = [];
  for (const form of issueForms) {
    if (drill.length >= ISSUE_TARGET_COUNT) break;
    // Best host for this issue word: fewest unknown words, then shortest.
    const host = scored
      .filter((s) => s.step.words.some((w) => wordKey(w.form) === form))
      .sort((a, b) => a.unknownCount - b.unknownCount || a.step.words.length - b.step.words.length)
      .map((s) => s.step)
      .find((step) => !picked.has(step.itemId));
    if (add(host)) drill.push(host);
  }

  // 3) Introduce — steps that carry exactly one new word (true i+1), fewest
  //    unknowns first, most-scaffolded first. Don't introduce the same new
  //    word twice.
  const introduced = new Set<string>();
  const introduce: LessonStep[] = [];
  for (const s of scored
    .filter((s) => s.unknownCount >= 1 && s.unknownCount <= NEW_PER_STEP_MAX)
    .sort((a, b) => a.unknownCount - b.unknownCount || b.knownRatio - a.knownRatio || a.step.words.length - b.step.words.length)) {
    if (introduce.length >= NEW_TARGET_COUNT_MAX) break;
    const newWord = s.step.words.find((w) => classifyWord(mastery[wordKey(w.form)]) === 'new');
    if (!newWord) continue;
    const k = wordKey(newWord.form);
    if (introduced.has(k)) continue;
    introduced.add(k);
    if (add(s.step)) introduce.push(s.step);
  }

  // 4) Consolidate — fill remaining slots by difficulty (fewest unknown words
  //    first), then stale-first (oldest seen word), then shortest. For a
  //    brand-new learner this produces the gradient; for a caught-up learner
  //    it produces a stale-first maintenance review.
  const assembled = [...warmup, ...drill, ...introduce];
  const remaining = (target <= assembled.length ? MAINTENANCE_SIZE : target) - assembled.length;
  if (remaining > 0) {
    const fill = scored
      .filter((s) => !picked.has(s.step.itemId))
      .sort((a, b) => {
        if (a.unknownCount !== b.unknownCount) return a.unknownCount - b.unknownCount;
        const aSeen = minLastSeen(a.step, mastery);
        const bSeen = minLastSeen(b.step, mastery);
        if (aSeen !== bSeen) return aSeen - bSeen;
        return a.step.words.length - b.step.words.length;
      })
      .slice(0, remaining)
      .map((s) => s.step);
    assembled.push(...fill);
  }

  // Ultimate fallback (corpus is never empty, but never return [] / never throw).
  const chosen = assembled.length > 0 ? assembled : corpus.slice(0, target);
  // Assign play modes (declared CLCC modes win; others via pickMode). Shallow
  // copies so shared corpus step objects are never mutated.
  return chosen.map((s, i) => ({ ...s, mode: pickMode(s, i) }));
}
