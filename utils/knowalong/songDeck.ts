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

/** Cap on scaffolding words the WHOLE section pre-teaches (shared across targets,
 *  first-come-first-served) — not a per-target budget. Without this each novel
 *  target would drag in its own 6 fresh spine words (CLCC grows deep), bloating a
 *  section to ~4×3 redundant lessons. With it, the first target that needs
 *  scaffolding consumes the budget (teaching the gradient once); later targets,
 *  their prerequisites already graduated by cross-target evolution, reveal in a
 *  single card (or via a Mode-A lyric host). Matches ARC_COMPANION_COUNT by
 *  intent but is a distinct (section-scoped) concept. */
const SECTION_SCAFFOLDING_BUDGET = 6;

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

/** Mark every word a set of lessons teaches as graduated in `evolved` (in place)
 *  — the cross-target evolution step. */
function graduateTaught(lessons: Lesson[], evolved: MasteryMap): void {
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      for (const w of step.words) {
        const k = wordKey(w.form);
        if (classifyWord(evolved[k]) !== 'graduated') evolved[k] = TAUGHT;
      }
    }
  }
}

/** Generate a song section's lessons from current mastery: one arc per lyric
 *  target (narrative order), with a SHARED scaffolding budget (the first target
 *  that needs prerequisites consumes it) and cross-target mastery evolution (each
 *  arc's words graduate before the next target, so scaffolding is reused, not
 *  re-taught). Graduated targets contribute no lessons. Pure + deterministic. */
export function buildSongSectionLessons(subDeck: SubDeck, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider): Lesson[] {
  const evolved: MasteryMap = { ...mastery };
  const icon = SECTION_ICON[subDeck.kind] ?? 'sparkles';
  const lessons: Lesson[] = [];
  let remaining = SECTION_SCAFFOLDING_BUDGET;
  sectionTargets(subDeck).forEach((target, i) => {
    const opts: BuildArcOptions = {
      idPrefix: `${DYNAMIC_SONG_PREFIX}${subDeck.id}-${i + 1}`,
      title: `${subDeck.label} · ${target.form}`,
      subtitle: target.gloss,
      icon,
      companionCount: remaining,
    };
    const arc = buildArcForTarget(target, evolved, spine, context, opts);
    if (arc.length === 0) return; // target already graduated → skip
    lessons.push(...arc);
    graduateTaught(arc, evolved); // next target reuses this arc's words as known context
    // Each arc reveals exactly one target card; the rest are scaffolding, drawn
    // from the shared section budget.
    const arcCards = arc.reduce((n, l) => n + l.steps.length, 0);
    remaining -= Math.max(0, arcCards - 1);
    if (remaining < 0) remaining = 0;
  });
  return lessons;
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
