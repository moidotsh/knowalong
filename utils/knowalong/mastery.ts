// utils/knowalong/mastery.ts
//
// Per-word mastery model — the adaptive-learning engine's state shape + pure
// helpers. Mock layer (client-side persisted; no Supabase). A word is
// identified by its Cyrillic chip `form` (raw, case-sensitive — 'Бог' ≠ 'бог'
// is meaningful). This is the same join key already used to dedupe distractor
// chips (see fixtures/learningItems.ts getDistractors), so a word mastered in
// one place is mastered everywhere — across both the Study screen and the
// song-lesson player.
//
// Fade rule: a chip's English gloss hides once the word has been placed
// correctly WORD_FADE_THRESHOLD times in a row. A wrong tap on its slot resets
// the streak to 0, re-showing the gloss (recovery from forgetting is
// first-class). The persisted state + mutations live in
// stores/wordMasteryStore.ts; this module is the pure read-side.

import type { LessonStep } from './fixtures/decks';

/** Gloss hides once a word's consecutive-correct streak reaches this. */
export const WORD_FADE_THRESHOLD = 5;

/** Zustand persistence key (mirrors the knowalong-*-v1 convention). */
export const WORD_MASTERY_STORAGE_KEY = 'knowalong-word-mastery-v1';

/** Per-word mastery record. `lastSeenMs` (epoch ms) powers stale-first ordering. */
export interface WordMastery {
  /** Times the word was shown on a chip (once per active step containing it). */
  exposures: number;
  /** Cumulative correct placements. */
  correct: number;
  /** Current consecutive-correct streak (reset to 0 on a mistake). Reaching
   *  WORD_FADE_THRESHOLD graduates the word (gloss hidden). */
  streak: number;
  /** Cumulative wrong taps on this word's slot. Drives issue prioritization. */
  mistakes: number;
  lastSeenMs: number | null;
}

/** The whole mastery table, keyed by normalized word form. */
export type MasteryMap = Record<string, WordMastery>;

/** Coarse classification used by the generator + the summary surface. */
export type WordClass = 'new' | 'learning' | 'graduated' | 'issue';

/** Identity key for a word. Raw form, trimmed — case is meaningful (Бог/бог). */
export function wordKey(form: string): string {
  return form.trim();
}

/** A brand-new word (no record) is 'new'; reaching the threshold 'graduates'
 *  it; a seen-but-not-graduated word with mistakes is an 'issue'. */
export function classifyWord(m: WordMastery | undefined): WordClass {
  if (!m || m.exposures === 0) return 'new';
  if (m.streak >= WORD_FADE_THRESHOLD) return 'graduated';
  if (m.mistakes > 0) return 'issue';
  return 'learning';
}

/** True when the English gloss should still be shown (word not yet graduated). */
export function shouldShowGloss(m: WordMastery | undefined): boolean {
  return !m || m.streak < WORD_FADE_THRESHOLD;
}

/** A word's progress toward graduation, clamped (e.g. "3/5" for display). */
export function streakProgress(m: WordMastery | undefined): number {
  return Math.min(m?.streak ?? 0, WORD_FADE_THRESHOLD);
}

export interface PhraseReadiness {
  /** Words never seen (the i+1 "new" load). */
  unknownCount: number;
  /** Seen but not graduated. */
  learningCount: number;
  graduatedCount: number;
  /** Subset of learning that carries mistakes (drill priority). */
  issueCount: number;
  /** (graduated + learning) / total — how scaffolded the phrase already is. */
  knownRatio: number;
}

/** Score a phrase's difficulty against current mastery. Pure. */
export function phraseReadiness(step: LessonStep, mastery: MasteryMap): PhraseReadiness {
  let unknownCount = 0;
  let learningCount = 0;
  let graduatedCount = 0;
  let issueCount = 0;
  const seen = new Set<string>();
  for (const w of step.words) {
    const k = wordKey(w.form);
    if (seen.has(k)) continue; // defensive: dedupe repeated forms within a step
    seen.add(k);
    const cls = classifyWord(mastery[k]);
    if (cls === 'new') unknownCount++;
    else if (cls === 'graduated') graduatedCount++;
    else {
      learningCount++;
      if (cls === 'issue') issueCount++;
    }
  }
  const total = unknownCount + learningCount + graduatedCount;
  const knownRatio = total === 0 ? 0 : (graduatedCount + learningCount) / total;
  return { unknownCount, learningCount, graduatedCount, issueCount, knownRatio };
}

export interface IssueWord {
  form: string;
  streak: number;
  mistakes: number;
}

export interface MasterySummary {
  /** Distinct words ever exposed. */
  seen: number;
  graduated: number;
  /** Seen but not graduated (inclusive of issue). */
  learning: number;
  /** Subset of learning with mistakes. */
  issue: number;
  /** Worst issue words (mistakes desc, streak asc) — capped for display. */
  issueWords: IssueWord[];
}

/** Summarize mastery over a set of word forms (typically the active corpus). */
export function summarizeMastery(forms: Iterable<string>, mastery: MasteryMap): MasterySummary {
  const unique = new Set<string>();
  for (const f of forms) unique.add(wordKey(f));
  let seen = 0;
  let graduated = 0;
  let learning = 0;
  const issueList: IssueWord[] = [];
  for (const k of unique) {
    const m = mastery[k];
    if (!m || m.exposures === 0) continue; // 'new' — not yet known
    seen++;
    const cls = classifyWord(m);
    if (cls === 'graduated') {
      graduated++;
    } else {
      learning++;
      if (cls === 'issue') issueList.push({ form: k, streak: m.streak, mistakes: m.mistakes });
    }
  }
  issueList.sort((a, b) => b.mistakes - a.mistakes || a.streak - b.streak);
  return { seen, graduated, learning, issue: issueList.length, issueWords: issueList.slice(0, 5) };
}
