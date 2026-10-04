// utils/knowalong/song/demoSongAdapter.ts
//
// Projects the fixture demo song (SVETOFOR_SONG + its sub-decks) into the
// canonical model. The demo song is the one fully-supported song today: every
// section has analyzed words + translations, and assessed practice runs
// through the existing `sdyn-` deck runtime. Pure + deterministic.

import { SVETOFOR_SONG, type SongSection } from '../fixtures/svetoforSong';
import { classifyWord, wordKey, type MasteryMap } from '../mastery';
import type { CanonicalLine, CanonicalSection, CanonicalSong, CanonicalWord } from './types';

/** The canonical (and fixture) id of the authorized demo song. */
export const DEMO_SONG_ID = 'svetofor';

/** The deck-runtime sub-deck id for a demo song section (`intro` → `sv-intro`). */
export function demoSubDeckIdForSection(sectionId: string): string {
  return `sv-${sectionId}`;
}

function toCanonicalWords(section: SongSection, ordinal: number): CanonicalWord[] | null {
  const line = section.lines.find((l) => l.ordinal === ordinal);
  if (!line) return null;
  return line.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role }));
}

export function demoLineToCanonical(section: SongSection, line: SongSection['lines'][number]): CanonicalLine {
  return {
    ordinal: line.ordinal,
    text: line.text,
    translation: line.translation,
    words: toCanonicalWords(section, line.ordinal),
    difficulty: line.difficulty,
  };
}

export function demoSectionToCanonical(section: SongSection, ordinal: number): CanonicalSection {
  return {
    id: section.id,
    ordinal,
    label: section.label,
    kind: section.kind,
    lines: section.lines.map((line) => demoLineToCanonical(section, line)),
    practice: 'supported',
  };
}

/** Summarize how much of the demo song the learner has practised: a section
 *  counts as supported (always true for the demo) and a line is "practised"
 *  when every analyzed word in it is graduated (the culminating-line gate). */
export function demoPracticeProgress(mastery: MasteryMap): { practisedLines: number } {
  let practisedLines = 0;
  for (const section of SVETOFOR_SONG.sections) {
    for (const line of section.lines) {
      if (line.words.length > 0 && line.words.every((w) => classifyWord(mastery[wordKey(w.form)]) === 'graduated')) {
        practisedLines += 1;
      }
    }
  }
  return { practisedLines };
}

/** The canonical demo song. Practice is 'supported' throughout — the deck
 *  runtime owns whether a specific target currently builds an arc. */
export function demoSongToCanonical(): CanonicalSong {
  const sections = SVETOFOR_SONG.sections.map((section, i) => demoSectionToCanonical(section, i + 1));
  const totalLines = sections.reduce((n, s) => n + s.lines.length, 0);
  const translatedLines = sections.reduce((n, s) => n + s.lines.filter((l) => l.translation !== null).length, 0);
  return {
    id: DEMO_SONG_ID,
    title: SVETOFOR_SONG.title,
    artist: SVETOFOR_SONG.artist,
    targetLanguage: SVETOFOR_SONG.language,
    origin: 'demo',
    prep: 'ready',
    statusNote: null,
    sections,
    practice: {
      supportedSections: sections.length,
      totalSections: sections.length,
      translatedLines,
      totalLines,
    },
    analysisSourceId: null,
  };
}
