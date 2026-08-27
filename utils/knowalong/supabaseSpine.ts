// utils/knowalong/supabaseSpine.ts
//
// The Supabase/Studio SpineProvider implementation (ADR Phase 6, the
// mock↔Supabase seam). Wraps the mock spine and REPLACES its concept
// ladder with the Studio-published concept_realizations rows when any
// exist — the first consumer-side consumer of the Studio publish path.
//
// Composition, not fork: foundational gradient + lyric steps + palette
// stay fixture-backed (they are Studio-independent or song-scoped);
// only conceptSteps() — the published CLCC ladder — reads Supabase.
// When the published set is empty (no Supabase configured, nothing
// published yet, or a read failure), the mock's ALL_CLCC_STEPS ladder
// serves unchanged. Absence is graceful; garbage never is.
//
// Wiring note: `getSpine()` in spine.ts still returns the mock by
// default. Switching the app-wide default to this provider is the
// operator's Phase-6 activation step (it changes what learners see);
// until then this module is exported for evaluation + tests. Demo mode
// (M4) never reads Supabase — the repository returns [] and the mock
// ladder serves.

import type { LessonStep } from './fixtures/decks';
import { createMockSpine, type SpineProvider } from './spine';
import { coreConceptRepository } from '../supabase/repositories';
import type { ConceptRealization } from '../../shared/types/knowalong';

/** Map one published realization row to a LessonStep. Deterministic —
 *  surfaceForm/gloss/transliteration come from the row verbatim; the
 *  words decomposition is the single surface form (the published row is
 *  one realization atom, not a phrase); grammaticalNote rides along as
 *  the step note. Realization rows the consumer can't render (no gloss)
 *  are skipped rather than shown with an empty meaning. */
export function stepFromPublishedRealization(
  realization: ConceptRealization,
  conceptCode: string,
): LessonStep | null {
  const gloss = realization.gloss?.trim();
  if (!realization.surfaceForm || !gloss) return null;
  const step: LessonStep = {
    itemId: `clcc-${conceptCode}-${realization.id.slice(0, 8)}`,
    surfaceForm: realization.surfaceForm,
    meaning: gloss,
    words: [
      {
        form: realization.surfaceForm,
        gloss,
        role: roleForRealizationType(realization.realizationType),
      },
    ],
    note: realization.grammaticalNote,
  };
  if (realization.transliteration) {
    step.transliteration = realization.transliteration;
  }
  return step;
}

/** Coarse POS role for chip styling. The published row's
 * realization_type is content-shaped (word/phrase/morpheme/…), not a
 * syntactic role — 'noun' is the neutral default the chip builder
 * renders without special styling. */
function roleForRealizationType(
  type: ConceptRealization['realizationType'],
): 'noun' {
  void type;
  return 'noun';
}

/** Build the Supabase-backed spine. The published ladder replaces the
 *  mock's ALL_CLCC_STEPS when the repository returns ≥1 row; every
 *  other layer delegates to the mock. Never throws — a repository
 *  failure logs and falls back (the ADR's degradation contract). */
export async function createSupabaseSpine(
  languageCode: string,
  userId: string,
): Promise<SpineProvider> {
  const mock = createMockSpine(languageCode);
  const result = await coreConceptRepository.findPublishedByLanguage(languageCode);
  if (!result.success || result.data.length === 0) {
    return mock;
  }

  // conceptId is a uuid; the step's itemId wants the human concept
  // CODE. The repository rows don't carry it (the join is server-side),
  // so steps key on realization id — stable per row and unique per
  // (concept, language) under the published-rows unique index.
  const published: LessonStep[] = [];
  for (const row of result.data) {
    const step = stepFromPublishedRealization(row, row.coreConceptId);
    if (step) published.push(step);
  }
  if (published.length === 0) return mock;

  return {
    languageCode: mock.languageCode,
    foundationalSteps: mock.foundationalSteps,
    conceptSteps: () => published,
    lyricSteps: mock.lyricSteps,
    paletteSteps: mock.paletteSteps,
  };
}
