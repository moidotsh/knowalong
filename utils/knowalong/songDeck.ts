// utils/knowalong/songDeck.ts
//
// Dynamic song-section lesson generation (ADR: mastery-driven-generation-adr.md,
// Phase 4). A song section's lessons are generated ON THE FLY from the learner's
// current mastery — one arc per lyric target word (buildArcForTarget), sized and
// cap-compliant — replacing the hand-authored dense V1/CH/V2/OUTRO packs and the
// static INTRO_LESSONS assembler (songCurriculum.ts, retired this phase).
//
// Cross-target evolution: mastery is evolved ACROSS targets within one section
// plan (each arc's taught words are marked graduated before the next target's
// arc is built). This dedupes scaffolding — Intro's targets share one teaching
// of the gradient instead of each re-teaching я/вижу/… in parallel — so the
// section reads as one coherent teaching sequence, not N redundant arcs. As a
// side effect it can graduate a later target's lyric-line context, letting Mode A
// reveal that target inside its real lyric line.
//
// Pure + deterministic. The song deck's SubDeck.lessons ship EMPTY
// (svetoforFullDeck.ts); this module materializes them at render time. The lesson
// player resolves `sdyn-` ids via resolveDynamicSongLesson (regenerate-and-find),
// falling back to getLesson for static decks — no module-level registry, no store
// coupling.

import type { Deck, Lesson, SectionKind, SubDeck } from './fixtures/decks';
import type { WordPart } from './fixtures/learningItems';
import { SVETOFOR_SONG } from './fixtures/svetoforSong';
import { SVETOFOR_SUBDECKS } from './fixtures/svetoforFullDeck';
import { SVETOFOR_DECK } from './fixtures/decks';
import { WORD_FADE_THRESHOLD, classifyWord, wordKey, type MasteryMap, type WordMastery } from './mastery';
import { buildArcForTarget, type BuildArcOptions } from './arcGenerator';
import type { SpineProvider } from './spine';
import type { ContextProvider } from './contextProvider';

/** Prefix on every dynamically-generated song lesson id, so the lesson player
 *  can route `sdyn-` ids to the resolver and leave static ids to getLesson. */
export const DYNAMIC_SONG_PREFIX = 'sdyn-';

/** Section kind → lesson icon (cosmetic; the section label also carries in the
 *  lesson title). */
const SECTION_ICON: Record<SectionKind, Lesson['icon']> = {
  intro: 'sparkles',
  verse: 'footprints',
  chorus: 'heart',
  bridge: 'brain',
  outro: 'waves',
};

/** A graduated record overlaid on taught words during cross-target evolution
 *  (matches the mastery module's graduated classification: streak ≥ threshold). */
const TAUGHT: WordMastery = {
  exposures: 1,
  correct: WORD_FADE_THRESHOLD,
  streak: WORD_FADE_THRESHOLD,
  mistakes: 0,
  lastSeenMs: 1,
};

/** Is `id` a dynamically-generated song lesson (resolved by regenerate-and-find,
 *  not the static ALL_DECKS lookup)? */
export function isDynamicSongLessonId(id: string | undefined | null): boolean {
  return !!id && id.startsWith(DYNAMIC_SONG_PREFIX);
}

/** The section's unique target words in narrative order (line order, then word
 *  order), as WordParts for buildArcForTarget. A word repeated across lines
 *  counts once (first occurrence). */
function sectionTargets(subDeck: SubDeck): WordPart[] {
  const section = SVETOFOR_SONG.sections.find((s) => s.id === subDeck.lyricSectionId);
  if (!section) return [];
  const seen = new Set<string>();
  const out: WordPart[] = [];
  for (const line of section.lines) {
    for (const w of line.words) {
      const k = wordKey(w.form);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push({ form: w.form, gloss: w.gloss, role: w.role });
    }
  }
  return out;
}

/** Mark the arc's TARGET as graduated in `evolved` (in place) — the cross-target
 *  evolution step. Only the target: an arc's context words are baseline (palette),
 *  presumed-known already, and graduating them here would wrongly skip a LATER
 *  target that doubles as a context word (e.g. `он`, `дух`) — its own arc would
 *  never build. */
function graduateTarget(target: WordPart, evolved: MasteryMap): void {
  const k = wordKey(target.form);
  if (classifyWord(evolved[k]) !== 'graduated') evolved[k] = TAUGHT;
}

/** A section's generated plan: its lessons PLUS the targets the generator
 *  deferred (design doc §1.4). A deferred target is neither graduated nor
 *  assessed — it gets an explicit "still growing" state with unassessed
 *  Explore/Listen activities, never a silently missing row and never a
 *  loosened assessment cap. */
export interface SongSectionPlan {
  lessons: Lesson[];
  deferred: WordPart[];
}

/** Generate a song section's plan from current mastery: one arc per lyric
 *  target (narrative order), with cross-target mastery evolution (each arc's words
 *  graduate before the next target, so context is reused, not re-taught). A target
 *  that is already graduated OR that defers (no teachable context phrase yet)
 *  contributes no lesson — deferred targets are reported in `deferred` instead.
 *  Pure + deterministic. */
export function buildSongSectionPlan(subDeck: SubDeck, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider): SongSectionPlan {
  const evolved: MasteryMap = { ...mastery };
  const icon = SECTION_ICON[subDeck.kind] ?? 'sparkles';
  const lessons: Lesson[] = [];
  const deferred: WordPart[] = [];
  sectionTargets(subDeck).forEach((target, i) => {
    const opts: BuildArcOptions = {
      idPrefix: `${DYNAMIC_SONG_PREFIX}${subDeck.id}-${i + 1}`,
      title: `${subDeck.label} · ${target.form}`,
      subtitle: target.gloss,
      icon,
    };
    const arc = buildArcForTarget(target, evolved, spine, context, opts);
    if (arc.length === 0) {
      // Already graduated (done) OR deferred (no teachable context yet) —
      // distinguish them so the UI can surface the deferred state honestly.
      if (classifyWord(evolved[wordKey(target.form)]) !== 'graduated') deferred.push(target);
      return;
    }
    lessons.push(...arc);
    graduateTarget(target, evolved); // this target is now known for later targets' lyric windows
  });
  return { lessons, deferred };
}

/** Generate a song section's lessons from current mastery (the plan's lessons
 *  only — the pre-§1.4 shape, kept for existing callers). */
export function buildSongSectionLessons(subDeck: SubDeck, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider): Lesson[] {
  return buildSongSectionPlan(subDeck, mastery, spine, context).lessons;
}

export interface ResolvedSongLesson {
  lesson: Lesson;
  deck: Deck;
  subDeck: SubDeck;
  /** The full materialized section, for next-lesson lookup. */
  lessons: Lesson[];
}

/** Resolve a `sdyn-` lesson id by regenerating each song section against current
 *  mastery and finding the id. Returns null if the id is gone (its target
 *  graduated and the arc shrank) — the caller falls back to the section. */
export function resolveDynamicSongLesson(lessonId: string, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider): ResolvedSongLesson | null {
  for (const subDeck of SVETOFOR_SUBDECKS) {
    const lessons = buildSongSectionLessons(subDeck, mastery, spine, context);
    const lesson = lessons.find((l) => l.id === lessonId);
    if (lesson) return { lesson, deck: SVETOFOR_DECK, subDeck, lessons };
  }
  return null;
}

/** The next lesson in a resolved section after `lessonId`, or null (last one). */
export function nextDynamicSongLesson(resolved: ResolvedSongLesson, lessonId: string): Lesson | null {
  const idx = resolved.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0 || idx + 1 >= resolved.lessons.length) return null;
  return resolved.lessons[idx + 1];
}
