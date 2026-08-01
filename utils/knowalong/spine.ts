// utils/knowalong/spine.ts
//
// The SpineProvider seam (ADR: mastery-driven-generation-adr.md, Phase 2 / §4).
// The adaptive generator (generateLesson.ts) and the chip builder
// (fixtures/chips.ts) depend on THIS interface, never on the fixture files
// directly. The seam isolates the scaffolding data source: the only
// implementation today is the mock spine (local fixtures); Phase 6 swaps in a
// Supabase/Studio spine behind the same interface — one implementation swap,
// not a scattergun edit across the generator.
//
// The seam exposes the three corpus layers the consumer pipeline composes into
// a flat phrase corpus (generateLesson.buildCorpus) and a flat word pool
// (chips.getWordPool):
//   - foundationalSteps: the compositional starter gradient (no prerequisites)
//   - conceptSteps:      the CLCC concept realizations (the majority spine, R6)
//   - lyricSteps:        the current song's lyric-phrase steps (the targets)
// Phase 3 grows this interface — concept → {form,gloss,role} lookup, candidate
// known-context phrases, and the narrative-order target list — when
// buildArcForTarget needs them. Until then the seam ships only what is consumed
// today; no unused surface.

import type { LessonStep } from './fixtures/decks';
import { LEARNING_ITEMS, type LearningItem } from './fixtures/learningItems';
import { ALL_CLCC_STEPS } from './fixtures/clccDeck';
import { ALL_SVETOFOR_LESSONS } from './fixtures/svetoforFullDeck';

/** The scaffolding + target corpus the consumer pipeline reads, behind a seam
 *  so the data source (mock fixtures today, Supabase/Studio in Phase 6) is
 *  swappable without touching generation logic. */
export interface SpineProvider {
  /** Target language this spine serves (e.g. 'ru'). */
  readonly languageCode: string;
  /** Compositional starter phrases — the foundational gradient, the atom layer
   *  with no prerequisites (R5's exempt starter seed). */
  foundationalSteps(): readonly LessonStep[];
  /** CLCC concept realizations — the published concept ladder; the majority
   *  scaffolding spine (R6). */
  conceptSteps(): readonly LessonStep[];
  /** Lyric-phrase steps for the current song — the targets layer, each phrase
   *  already decomposed into words with glosses. */
  lyricSteps(): readonly LessonStep[];
}

/** Map a LearningItem to the unified LessonStep shape (mirrors decks.ts
 *  lessonFromItems, but per-step rather than per-lesson). Pure. Lives on the
 *  spine because it is how the mock turns the gradient fixture into steps. */
export function stepFromLearningItem(item: LearningItem): LessonStep {
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
}

/** Build a mock spine backed by the local fixtures. The v1 (and only)
 *  implementation; Phase 6 adds a Supabase/Studio implementation that reads
 *  published concept_realizations, with this mock as the fallback. Pure. */
export function createMockSpine(languageCode: string): SpineProvider {
  return {
    languageCode,
    foundationalSteps: () => LEARNING_ITEMS.map(stepFromLearningItem),
    conceptSteps: () => [...ALL_CLCC_STEPS],
    lyricSteps: () => ALL_SVETOFOR_LESSONS.flatMap((l) => l.steps),
  };
}

let DEFAULT_SPINE: SpineProvider | null = null;

/** The app-wide default spine. Mock today; Phase 6 resolves this from the
 *  learner-Supabase read path (approval-gated), keeping the mock as fallback. */
export function getSpine(): SpineProvider {
  if (DEFAULT_SPINE) return DEFAULT_SPINE;
  DEFAULT_SPINE = createMockSpine('ru');
  return DEFAULT_SPINE;
}
