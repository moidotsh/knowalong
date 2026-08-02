// utils/knowalong/culminatingLines.ts
//
// Mastery-gated culminating line lessons (ADR Phase 5). Once every word in a lyric
// line is graduated (via the per-word arcs of Phase 4.1+), the learner can open a
// culminating lesson whose single card is the FULL line — the synthesis, every word
// now comprehensible and assembled from chips. Until then it is LOCKED (strict
// mastery-gate, per the ADR). Lines containing deferred words (no teachable context
// yet) stay locked until the AI ContextProvider (Phase 6) graduates them.
//
// Pure + deterministic. A culminating lesson is 0-new (all words graduated) →
// cap-safe (asserted as a backstop).

import type { Deck, Lesson, LessonStep, SubDeck } from './fixtures/decks';
import { SVETOFOR_SONG, type LyricLine } from './fixtures/svetoforSong';
import { SVETOFOR_SUBDECKS } from './fixtures/svetoforFullDeck';
import { SVETOFOR_DECK } from './fixtures/decks';
import { DYNAMIC_SONG_PREFIX } from './songDeck';
import { classifyWord, wordKey, type MasteryMap } from './mastery';
import { assertLessonWithinCap } from './concept';

/** The lyric section's lines for a sub-deck (via its lyricSectionId). */
function sectionLines(subDeck: SubDeck): LyricLine[] {
  const section = SVETOFOR_SONG.sections.find((s) => s.id === subDeck.lyricSectionId);
  return section ? section.lines : [];
}

/** The culminating lesson id for a line: `sdyn-<subDeckId>-line-<ordinal>`. The
 *  `-line-` literal + ordinal keep it distinct from arc ids (`sdyn-…-<n>-lN`). */
export function culminatingLineLessonId(subDeckId: string, ordinal: number): string {
  return `${DYNAMIC_SONG_PREFIX}${subDeckId}-line-${ordinal}`;
}

/** Is `id` a culminating line lesson id (vs an arc id or a static-deck id)? */
export function isCulminatingLineLessonId(id: string | undefined | null): boolean {
  return !!id && id.startsWith(DYNAMIC_SONG_PREFIX) && id.includes('-line-');
}

/** A line is unlocked when it has words and ALL are graduated. */
export function isLineUnlocked(line: LyricLine, mastery: MasteryMap): boolean {
  return line.words.length > 0 && line.words.every((w) => classifyWord(mastery[wordKey(w.form)]) === 'graduated');
}

/** Build the culminating lesson for a line (1 card = the full line). Caller MUST
 *  ensure the line is unlocked (all words graduated → 0 new → cap-safe). The chip
 *  surface is the analyzed words joined (matches the chip set); the real line.text
 *  shows as the post-solve context sentence. */
export function buildCulminatingLineLesson(subDeck: SubDeck, line: LyricLine): Lesson {
  const id = culminatingLineLessonId(subDeck.id, line.ordinal);
  const step: LessonStep = {
    itemId: `${id}-card`,
    surfaceForm: line.words.map((w) => w.form).join(' '),
    meaning: line.translation,
    words: line.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
    contextSentence: { ru: line.text, en: line.translation },
  };
  return {
    id,
    title: `${subDeck.label} · line ${line.ordinal}`,
    subtitle: line.translation,
    icon: 'waves',
    steps: [step],
    stepCount: 1,
  };
}

export interface CulminatingLine {
  ordinal: number;
  text: string;
  translation: string;
  unlocked: boolean;
  /** Un-graduated word count (for the "N words to go" lock label). */
  missingCount: number;
  /** The playable lesson, present only when unlocked. */
  lesson: Lesson | null;
}

/** Per-line capstone state for the section screen (display + gating). */
export function buildCulminatingLines(subDeck: SubDeck, mastery: MasteryMap): CulminatingLine[] {
  return sectionLines(subDeck).map((line) => {
    const missing = line.words.filter((w) => classifyWord(mastery[wordKey(w.form)]) !== 'graduated').length;
    const unlocked = isLineUnlocked(line, mastery);
    const lesson = unlocked ? buildCulminatingLineLesson(subDeck, line) : null;
    if (lesson) assertLessonWithinCap(lesson, mastery); // 0-new backstop (all graduated)
    return { ordinal: line.ordinal, text: line.text, translation: line.translation, unlocked, missingCount: missing, lesson };
  });
}

export interface ResolvedCulminatingLine {
  lesson: Lesson;
  deck: Deck;
  subDeck: SubDeck;
  /** All culminating lines in this section (for next-line lookup). */
  lines: CulminatingLine[];
}

/** Resolve a culminating line lesson id by regenerating each section's unlocked
 *  culminating lines and finding the id. Returns null if the line is locked (not all
 *  words graduated — the learner can't open it) or the id is unknown. */
export function resolveCulminatingLineLesson(lessonId: string, mastery: MasteryMap): ResolvedCulminatingLine | null {
  for (const subDeck of SVETOFOR_SUBDECKS) {
    const lines = buildCulminatingLines(subDeck, mastery);
    const hit = lines.find((l) => l.lesson?.id === lessonId);
    if (hit?.lesson) return { lesson: hit.lesson, deck: SVETOFOR_DECK, subDeck, lines };
  }
  return null;
}

/** The next unlocked culminating line after `lessonId` in the same section, or null. */
export function nextCulminatingLine(resolved: ResolvedCulminatingLine, lessonId: string): Lesson | null {
  const idx = resolved.lines.findIndex((l) => l.lesson?.id === lessonId);
  for (let i = idx + 1; i < resolved.lines.length; i++) {
    const ln = resolved.lines[i];
    if (ln.lesson) return ln.lesson;
  }
  return null;
}
