// utils/knowalong/song/selectors.ts
//
// Pure read-side selectors over the canonical song model + learner mastery
// (design doc §1.1). Power the four surfaces:
//   • Today — the next useful passage of the active song + the due-review set.
//   • Words — saved forms with song associations and recall evidence.
//   • Song detail — honest per-section progress.
// Pure + deterministic: no React, no stores, no I/O — callers pass state in.

import { SVETOFOR_SUBDECKS } from '../fixtures/svetoforFullDeck';
import { classifyWord, wordKey, type MasteryMap } from '../mastery';
import { buildSongSectionPlan } from '../songDeck';
import { buildCulminatingLines } from '../culminatingLines';
import { getSpine } from '../spine';
import { getContext } from '../contextProvider';
import { demoSubDeckIdForSection } from './demoSongAdapter';
import type { CanonicalSong } from './types';

// ─── Word associations (Words surface) ─────────────────────────────────

export interface SongWordInfo {
  key: string;
  form: string;
  /** Best available gloss across songs; null when no song analyzed it. */
  gloss: string | null;
  /** Canonical song ids containing this form. */
  songIds: string[];
}

/** Join every analyzed word across canonical songs by mastery key
 *  (case-sensitive trimmed form — the same key the runtime records). */
export function selectSongWords(songs: CanonicalSong[]): Map<string, SongWordInfo> {
  const map = new Map<string, SongWordInfo>();
  for (const song of songs) {
    for (const section of song.sections) {
      for (const line of section.lines) {
        for (const word of line.words ?? []) {
          const k = wordKey(word.form);
          const existing = map.get(k);
          if (existing) {
            if (!existing.songIds.includes(song.id)) existing.songIds.push(song.id);
            if (existing.gloss === null && word.gloss !== null) existing.gloss = word.gloss;
          } else {
            map.set(k, { key: k, form: word.form, gloss: word.gloss, songIds: [song.id] });
          }
        }
      }
    }
  }
  return map;
}

export type RecallState = 'new' | 'learning' | 'issue' | 'graduated';

export interface KnownWord {
  key: string;
  form: string;
  gloss: string | null;
  state: RecallState;
  streak: number;
  mistakes: number;
  lastSeenMs: number | null;
  songIds: string[];
}

/** Every mastery-recorded word joined with song associations. `form` is the
 *  mastery key itself (wordKey = trimmed form). Words never seen in any song
 *  (palette/spine words met in Study) still appear, association-free. */
export function selectKnownWords(mastery: MasteryMap, songs: CanonicalSong[]): KnownWord[] {
  const associations = selectSongWords(songs);
  const out: KnownWord[] = [];
  for (const [key, record] of Object.entries(mastery)) {
    if (!record || record.exposures === 0) continue; // never-shown records are noise
    const assoc = associations.get(key);
    out.push({
      key,
      form: key,
      gloss: assoc?.gloss ?? null,
      state: classifyWord(record),
      streak: record.streak,
      mistakes: record.mistakes,
      lastSeenMs: record.lastSeenMs,
      songIds: assoc?.songIds ?? [],
    });
  }
  return out;
}

/** The due-review set (§1.1 Today): issue words first (most mistakes first),
 *  then learning words stalest-seen first. Graduated words are NOT due. */
export function selectDueWords(mastery: MasteryMap, songs: CanonicalSong[], limit = 30): KnownWord[] {
  const due = selectKnownWords(mastery, songs)
    .filter((w) => w.state === 'issue' || w.state === 'learning')
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === 'issue' ? -1 : 1;
      if (a.state === 'issue' && b.state === 'issue') return b.mistakes - a.mistakes;
      return (a.lastSeenMs ?? 0) - (b.lastSeenMs ?? 0);
    });
  return due.slice(0, limit);
}

// ─── Next useful passage (Today surface) ────────────────────────────────

export interface NextPassage {
  songId: string;
  sectionId: string;
  sectionLabel: string;
  /** The lesson to open in `/lessons/[lessonId]` (`sdyn-` id). */
  lessonId: string;
  lessonTitle: string;
  kind: 'arc' | 'culminating';
}

/** The demo song's next useful passage: the first not-yet-completed arc lesson
 *  in narrative section order; when every arc is complete, the first unlocked
 *  un-completed culminating line. Null = nothing ready to play. Mirrors the
 *  deck-runtime resolution exactly (same generators, same mastery input). */
export function nextDemoPassage(mastery: MasteryMap, completedLessonIds: readonly string[]): NextPassage | null {
  const spine = getSpine();
  const context = getContext();

  for (const subDeck of SVETOFOR_SUBDECKS) {
    const plan = buildSongSectionPlan(subDeck, mastery, spine, context);
    const lesson = plan.lessons.find((l) => !completedLessonIds.includes(l.id));
    if (lesson) {
      return {
        songId: 'svetofor',
        sectionId: subDeck.lyricSectionId ?? subDeck.id,
        sectionLabel: subDeck.label,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        kind: 'arc',
      };
    }
  }

  // All arcs done (or deferred): the first unlocked culminating line continues
  // the song's synthesis. buildCulminatingLines iterates the same sub-deck order.
  for (const subDeck of SVETOFOR_SUBDECKS) {
    if (!subDeck.lyricSectionId) continue;
    const lines = buildCulminatingLines(subDeck, mastery);
    const line = lines.find((c) => c.lesson && !completedLessonIds.includes(c.lesson.id));
    if (line?.lesson) {
      return {
        songId: 'svetofor',
        sectionId: subDeck.lyricSectionId,
        sectionLabel: subDeck.label,
        lessonId: line.lesson.id,
        lessonTitle: line.lesson.title,
        kind: 'culminating',
      };
    }
  }

  return null;
}

/** The canonical section id of the passage containing `lessonId`'s next play —
 *  used by the tab bar's center action when the learner is deep in a song. */
export function demoSectionIdForSubDeck(subDeckId: string): string | null {
  return SVETOFOR_SUBDECKS.find((s) => s.id === subDeckId)?.lyricSectionId ?? null;
}

/** Inverse of `demoSubDeckIdForSection`, verified against the real sub-decks. */
export function demoSubDeckForSection(sectionId: string): string | null {
  const hit = SVETOFOR_SUBDECKS.find((s) => s.lyricSectionId === sectionId);
  return hit ? hit.id : demoSubDeckIdForSection(sectionId);
}

// ─── Deferred targets (§1.4) ────────────────────────────────────────────

export interface DeferredTarget {
  form: string;
  gloss: string;
  sectionId: string;
  subDeckId: string;
  sectionLabel: string;
}

/** Across the whole demo song: targets the generator deferred (no teachable
 *  context yet) — the explicit "still growing" set, never silently missing. */
export function selectDeferredTargets(mastery: MasteryMap): DeferredTarget[] {
  const spine = getSpine();
  const context = getContext();
  const out: DeferredTarget[] = [];
  for (const subDeck of SVETOFOR_SUBDECKS) {
    const plan = buildSongSectionPlan(subDeck, mastery, spine, context);
    for (const target of plan.deferred) {
      out.push({
        form: target.form,
        gloss: target.gloss,
        sectionId: subDeck.lyricSectionId ?? subDeck.id,
        subDeckId: subDeck.id,
        sectionLabel: subDeck.label,
      });
    }
  }
  return out;
}
