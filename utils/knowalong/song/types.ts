// utils/knowalong/song/types.ts
//
// The canonical song model (design doc §1.1). One shape that BOTH content
// origins project into:
//   • the fixture demo song (Светофор — word-analyzed, practice-supported via
//     the `sdyn-` runtime), and
//   • a library learning source (repository-backed; honest preparing/partial
//     states until the analysis pipeline lands a validated pack).
//
// Consumers (Today / My Songs / song detail / passage reader / Words) render
// this shape only — they never import fixture or repository types directly.
// Adapters live beside this file (demoSongAdapter.ts, librarySongAdapter.ts).

/** Where a canonical song's content comes from. */
export type SongOrigin = 'demo' | 'library';

/**
 * Honest shelf state (§1.1 "My songs" surfaces). What the learner can do
 * right now — never a fake percentage of an unanalyzed song:
 *   • ready      — passages support assessed practice today (demo song, or a
 *                  future validated pack).
 *   • partial    — readable + explorable, practice prepared for some scope.
 *   • preparing  — saved/valid text; analysis pending, in progress, or failed.
 *   • archived   — kept out of Today and the active shelf; restorable.
 */
export type SongPrep = 'ready' | 'partial' | 'preparing' | 'archived';

/**
 * Per-section practice availability (§1.4 Explore vs Practice):
 *   • supported    — assessed lessons exist (burden-capped by the runtime).
 *   • explore-only — readable with support visible; no assessed lessons yet.
 *   • unavailable  — raw text only; nothing prepared (still honestly shown).
 */
export type SectionPractice = 'supported' | 'explore-only' | 'unavailable';

export type CanonicalSectionKind = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'section';

/** One analyzed word of a line. `gloss`/`role` stay null when unanalyzed —
 *  the UI never invents glosses for text-only songs (§1.5). */
export interface CanonicalWord {
  form: string;
  gloss: string | null;
  role: string | null;
}

export interface CanonicalLine {
  /** 1-based ordinal within the section. */
  ordinal: number;
  /** The preserved line text (never rewritten for display). */
  text: string;
  /** Phrase translation when supported; null = not analyzed yet. */
  translation: string | null;
  /** Analyzed words when supported; null = text-only line. */
  words: CanonicalWord[] | null;
  /** Display-only register/difficulty hint from analysis; never a gate. */
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

export interface CanonicalSection {
  id: string;
  /** 1-based ordinal within the song. */
  ordinal: number;
  label: string;
  kind: CanonicalSectionKind;
  lines: CanonicalLine[];
  practice: SectionPractice;
}

export interface SongPracticeSummary {
  /** Sections whose passages support assessed practice today. */
  supportedSections: number;
  totalSections: number;
  /** Lines with a supported translation (Explore coverage). */
  translatedLines: number;
  totalLines: number;
}

export interface CanonicalSong {
  /** Stable id used by `/song/[songId]` routes. The demo song id is 'svetofor';
   *  library songs use their learning-source id. */
  id: string;
  title: string;
  artist: string | null;
  targetLanguage: string;
  origin: SongOrigin;
  prep: SongPrep;
  /** Short honest status line for shelf/detail rows (why preparing, etc.). */
  statusNote: string | null;
  sections: CanonicalSection[];
  practice: SongPracticeSummary;
  /** For library songs: the learning-source id powering analysis flows
   *  (same as `id` today, but explicit so routes never assume). */
  analysisSourceId: string | null;
}
