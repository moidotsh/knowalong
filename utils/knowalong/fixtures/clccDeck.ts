// utils/knowalong/fixtures/clccDeck.ts
//
// Builds the CLCC deck family from clccSeed.ts — mirrors the Svetofor song
// deck's structure (Deck → SubDeck → Lesson → LessonStep) so the existing
// deck browser (app/lessons.tsx), deck overview, section screen, and
// sequential-locking logic (isLessonUnlocked) all work unchanged.
//
// Sub-decks are grouped by tier band; each band is chunked into lessons of
// ~7 concepts. Each seed row becomes one step whose mode is inferred:
// cloze (verbs with sentence context) → reverse (multi-word phrases) → build
// (single words). This gives a natural mix of all three interaction modes
// across the deck without a special-case branch per step.

import type { Deck, Lesson, LessonStep, SubDeck, SectionKind } from './decks';
import { CLCC_SEED, rowWords, inferredMode, type ClccSeedRow } from './clccSeed';

/** Concepts per CLCC lesson. */
const LESSON_SIZE = 7;

/** Build a single chip-builder step from a seed row. Pure. */
function cardFromRow(row: ClccSeedRow): LessonStep {
  const words = rowWords(row).map((w) => ({ form: w.form, gloss: w.gloss, role: w.role }));
  const mode = inferredMode(row);
  const step: LessonStep = {
    itemId: `clcc-${row.code.toLowerCase()}`,
    surfaceForm: row.surfaceForm,
    meaning: row.cloze ? row.cloze.meaning : row.gloss,
    transliteration: row.transliteration,
    words,
    note: row.note ?? null,
    contextSentence: row.exampleRu ? { ru: row.exampleRu, en: row.exampleEn ?? '' } : undefined,
    mode,
  };
  if (row.cloze) {
    step.clozePrompt = row.cloze.prompt;
    step.clozeAnswer = row.cloze.answer;
    step.clozeMeaning = row.cloze.meaning;
  }
  return step;
}

/** Chunk into consecutive groups of `size` (last group may be shorter). */
function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Tier band → sub-deck descriptor. `kind` is the song-section enum required
 *  by SubDeck; for non-song decks it is cosmetic (the section screen shows
 *  `label`). No `lyricSectionId` — CLCC has no lyrics. */
interface Band {
  id: string;
  label: string;
  kind: SectionKind;
  icon: Lesson['icon'];
  tiers: readonly number[];
}

const BANDS: readonly Band[] = [
  { id: 'clcc-foundations', label: 'Foundations', kind: 'intro', icon: 'user', tiers: [0] },
  { id: 'clcc-actions', label: 'Core actions', kind: 'verse', icon: 'footprints', tiers: [1] },
  { id: 'clcc-connecting', label: 'Asking & connecting', kind: 'chorus', icon: 'help-circle', tiers: [2] },
  { id: 'clcc-grammar', label: 'Grammar', kind: 'bridge', icon: 'brain', tiers: [3, 4] },
  { id: 'clcc-register', label: 'Register & idiom', kind: 'outro', icon: 'sparkles', tiers: [5, 6, 7, 8, 9] },
];

/** Build the full CLCC deck from the seed. Pure + deterministic. */
export function buildClccDeck(): Deck {
  const subDecks: SubDeck[] = BANDS.map((band) => {
    const rows = CLCC_SEED.filter((r) => band.tiers.includes(r.tier));
    const steps = rows.map(cardFromRow);
    const chunks = chunk(steps, LESSON_SIZE);
    const lessons: Lesson[] = chunks.map((stp, i) => ({
      id: `${band.id}-l${i + 1}`,
      title: `${band.label} · ${i + 1}`,
      subtitle: `${stp.length} concepts`,
      icon: band.icon,
      steps: stp,
      stepCount: stp.length,
    }));
    return { id: band.id, label: band.label, kind: band.kind, lessons };
  });

  const lessons = subDecks.flatMap((sd) => sd.lessons);
  return {
    id: 'clcc-deck',
    title: 'Core Concepts',
    subtitle: 'The Russian concept ladder — pronouns to idiom',
    icon: 'sparkles',
    lessons,
    subDecks,
  };
}

export const CLCC_DECK: Deck = buildClccDeck();

/** Every CLCC step, flattened — consumed by the adaptive generator's corpus. */
export const ALL_CLCC_STEPS: readonly LessonStep[] = CLCC_DECK.lessons.flatMap((l) => l.steps);
