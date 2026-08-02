// utils/knowalong/fixtures/svetoforFullDeck.ts
//
// The Светофор song deck structure (Deck → Sub-decks/sections). As of Phase 4
// (ADR: mastery-driven-generation-adr.md) the song is taught DYNAMICALLY: each
// section's lessons are generated on the fly from the learner's mastery by
// utils/knowalong/songDeck.ts → buildSongSectionLessons (one arc per lyric target
// word, cap-compliant). The hand-authored dense V1/CH/V2/OUTRO lessons and the
// static INTRO_LESSONS assembler (songCurriculum.ts) are retired.
//
// The sub-decks therefore ship with lessons: [] — their lessons are materialized
// at render time. `lyricSectionId` still joins each sub-deck to its raw-lyrics
// section in svetoforSong.ts (used by buildSongSectionLessons + the section
// screen's lyric mosaic). ALL_SVETOFOR_LESSONS is kept (empty) so the static
// deck helpers in decks.ts (getLesson / deckProgress / nextLessonAudioTexts)
// keep typechecking; song lessons never live here.

import type { Lesson, SubDeck } from './decks';

/** The song's sections, each joined to its raw-lyrics section via
 *  `lyricSectionId`. `lessons` is empty — materialized dynamically. */
export const SVETOFOR_SUBDECKS: SubDeck[] = [
  { id: 'sv-intro', label: 'Intro', kind: 'intro', lyricSectionId: 'intro', lessons: [] },
  { id: 'sv-verse-1', label: 'Verse 1', kind: 'verse', lyricSectionId: 'verse-1', lessons: [] },
  { id: 'sv-chorus', label: 'Chorus', kind: 'chorus', lyricSectionId: 'chorus', lessons: [] },
  { id: 'sv-verse-2', label: 'Verse 2', kind: 'verse', lyricSectionId: 'verse-2', lessons: [] },
  { id: 'sv-outro', label: 'Outro', kind: 'outro', lyricSectionId: 'outro', lessons: [] },
];

/** Empty — song lessons are dynamic. Kept so decks.ts's static helpers compile. */
export const ALL_SVETOFOR_LESSONS: Lesson[] = [];
