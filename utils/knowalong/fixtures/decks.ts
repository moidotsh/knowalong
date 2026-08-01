// utils/knowalong/fixtures/decks.ts
//
// The complete lesson/deck system. Unifies learning items + gradient
// lessons + song sections into one cohesive model:
//
//   Deck → Lessons → Steps (learning items with chip-builder rounds)
//
// Each deck is a themed collection. Each lesson is a sequence of items
// the learner builds via the chip-builder. Song sections become lessons
// within a song deck. Progress is tracked per-lesson via the streak store.

import { LEARNING_ITEMS, type LearningItem } from './learningItems';
import { ALL_SVETOFOR_LESSONS, SVETOFOR_SUBDECKS } from './svetoforFullDeck';

export interface LessonStep {
  itemId: string;
  surfaceForm: string;
  meaning: string;
  transliteration?: string;
  emoji?: string;
  words: LearningItem['words'];
  construction?: LearningItem['construction'];
  contextSentence?: LearningItem['contextSentence'];
  note?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  icon: 'user' | 'eye' | 'brain' | 'hand-heart' | 'footprints' | 'home' | 'heart' | 'help-circle' | 'waves' | 'coffee' | 'sparkles' | 'book';
  steps: LessonStep[];
  stepCount: number;
}

export interface Deck {
  id: string;
  title: string;
  subtitle: string;
  icon: 'book' | 'brain' | 'waves' | 'sparkles';
  lessons: Lesson[];
  // Optional grouping for song decks: sections (intro / verse N / chorus /
  // bridge / outro) each holding its own ordered lessons. Absent on flat
  // decks (Foundations, Daily Life, …), in which case the deck overview
  // lists `lessons` directly. Songs ARE decks — this is the sub-deck layer.
  subDecks?: SubDeck[];
}

// A song section treated as a sub-deck. `lyricSectionId` joins this sub-deck
// to the raw-lyrics section in svetoforSong.ts so the section screen can
// preview the lines the lessons build toward.
export type SectionKind = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';

export interface SubDeck {
  id: string;
  label: string;
  kind: SectionKind;
  lessons: Lesson[];
  lyricSectionId?: string;
}

// Build a lesson from a subset of LEARNING_ITEMS by IDs.
function lessonFromItems(id: string, title: string, subtitle: string, icon: Lesson['icon'], itemIds: string[]): Lesson {
  const steps: LessonStep[] = itemIds.map((iid) => {
    const item = LEARNING_ITEMS.find((i) => i.id === iid);
    // s10-exempt: internal fixture-build invariant — a missing item id is a programmer error in deck data, not a runtime surface.
    if (!item) throw new Error(`Item ${iid} not found`);
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
  });
  return { id, title, subtitle, icon, steps, stepCount: steps.length };
}

// ── Foundations Deck: Tier 0 — the first four phrases ──────────────
const FOUNDATIONS: Deck = {
  id: 'foundations',
  title: 'Foundations',
  subtitle: 'Your first Russian phrases — built from "I"',
  icon: 'book',
  lessons: [
    lessonFromItems('f-1', 'The Word "I"', 'The atom everything builds on', 'user', ['1']),
    lessonFromItems('f-2', 'I See', 'First person + first verb', 'eye', ['2']),
    lessonFromItems('f-3', 'I Know', 'Another verb, same pattern', 'brain', ['3']),
    lessonFromItems('f-4', 'I Want', 'Irregular conjugation', 'hand-heart', ['4']),
  ],
};

// ── Daily Life Deck: Tier 1 — motion, living, liking ────────────────
const DAILY_LIFE: Deck = {
  id: 'daily-life',
  title: 'Daily Life',
  subtitle: 'Going, living, liking — your everyday vocabulary',
  icon: 'brain',
  lessons: [
    lessonFromItems('d-1', 'I Am Going', 'Motion + direction', 'footprints', ['5']),
    lessonFromItems('d-2', 'I Live', 'Where you are', 'home', ['6']),
    lessonFromItems('d-3', 'I Like', 'The dative flip — a new structure', 'heart', ['7']),
  ],
};

// ── Expressions Deck: Tier 2 — composites + negation ────────────────
const EXPRESSIONS: Deck = {
  id: 'expressions',
  title: 'Expressions',
  subtitle: 'Negation + objects — full sentences',
  icon: 'sparkles',
  lessons: [
    lessonFromItems('e-1', "I Don't Know", 'Negation with "не"', 'help-circle', ['8']),
    lessonFromItems('e-2', 'I See the Sea', 'Adding objects', 'waves', ['9']),
    lessonFromItems('e-3', 'I Want Tea', 'Another composite', 'coffee', ['10']),
  ],
};

// ── Светофор Deck: hand-authored chip-builder lessons per section ───
const SVETOFOR_DECK: Deck = {
  id: 'svetofor',
  title: 'Светофор',
  subtitle: 'Mnogoznaal — learn Russian through a real song',
  icon: 'waves',
  lessons: ALL_SVETOFOR_LESSONS,
  subDecks: SVETOFOR_SUBDECKS,
};

// ── Exports ───────────────────────────────────────────────────────────

export const ALL_DECKS: readonly Deck[] = [
  FOUNDATIONS,
  DAILY_LIFE,
  EXPRESSIONS,
  SVETOFOR_DECK,
];

export function getDeck(deckId: string): Deck | null {
  return ALL_DECKS.find((d) => d.id === deckId) ?? null;
}

export function getLesson(lessonId: string): Lesson | null {
  for (const deck of ALL_DECKS) {
    const lesson = deck.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

export function getLessonDeck(lessonId: string): Deck | null {
  return ALL_DECKS.find((d) => d.lessons.some((l) => l.id === lessonId)) ?? null;
}

// Resolve the sub-deck (section) that owns a lesson — used by the lesson
// player to render a context-aware "next lesson / back to section" footer.
export function getLessonSubDeck(lessonId: string): SubDeck | null {
  for (const deck of ALL_DECKS) {
    const sd = deck.subDecks?.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (sd) return sd;
  }
  return null;
}

export function getSubDeck(deckId: string, subDeckId: string): SubDeck | null {
  const deck = getDeck(deckId);
  return deck?.subDecks?.find((sd) => sd.id === subDeckId) ?? null;
}
