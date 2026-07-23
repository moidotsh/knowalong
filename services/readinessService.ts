// services/readinessService.ts
// Thin: fetches study cards + review states for a source or section,
// delegates to the pure calculateReadiness(), and (in non-demo mode)
// persists the snapshot. The pure function is the source of truth for
// the formula; this service is the I/O seam.

import type {
  ReadinessResult,
  ReadinessCard,
  StudyCard,
  ReviewState,
  ReadinessSnapshotComponent,
} from '../shared/types/knowalong';
import {
  studyCardRepository,
  reviewRepository,
  throwIfFailed,
  DEMO_MODE,
} from '../utils/supabase/repositories';
import {
  calculateReadiness,
  sourceDerivedOnly,
  CALCULATION_VERSION,
} from '../utils/knowalong/readiness';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

function toReadinessCards(cards: StudyCard[], statesByCard: Map<string, ReviewState>): ReadinessCard[] {
  return cards.map((c) => {
    const state = statesByCard.get(c.id);
    return {
      cardId: c.id,
      cardStatus: state?.cardStatus ?? 'new',
      repetitions: state?.repetitions ?? 0,
      lapses: state?.lapses ?? 0,
      lastReviewedAt: state?.lastReviewedAt ?? null,
      dueAt: state?.dueAt ?? null,
      generatedContent: c.generatedContent,
    };
  });
}

export const readinessService = {
  /** Compute readiness for a source (all source-derived cards). */
  async computeForSource(sourceId: string, userId: string): Promise<ReadinessResult> {
    const cards = throwIfFailed(await studyCardRepository.findBySource(sourceId, userId), 'readiness.cards');
    const sourceDerived = sourceDerivedOnly(
      cards.map((c) => ({
        cardId: c.id,
        cardStatus: 'new',
        repetitions: 0,
        lapses: 0,
        lastReviewedAt: null,
        dueAt: null,
        generatedContent: c.generatedContent,
      })),
    );
    // Fetch review states for each card.
    const stateResults = await Promise.all(
      sourceDerived.map((c) => reviewRepository.findStateByCard(c.cardId, userId)),
    );
    const statesByCard = new Map<string, ReviewState>();
    stateResults.forEach((r, i) => {
      if (r.success && r.data) statesByCard.set(sourceDerived[i].cardId, r.data);
    });
    const fullCards = toReadinessCards(
      cards.filter((c) => !c.generatedContent),
      statesByCard,
    );
    const result = calculateReadiness({
      cards: fullCards,
      totalEligibleCards: fullCards.length,
      now: new Date().toISOString(),
    });

    // Persist snapshot in non-demo mode (best-effort; never fail the read).
    if (!DEMO_MODE && result.kind === 'score') {
      try {
        await supabase.from('source_readiness_snapshots').insert({
          user_id: userId,
          source_id: sourceId,
          section_id: null,
          readiness_score: result.score,
          version: result.version,
          components: result.components as ReadinessSnapshotComponent[],
        });
      } catch (e) {
        logger.warn('data', 'readiness snapshot persist failed', e);
      }
    }

    return result;
  },

  /** Compute readiness for a single section. */
  async computeForSection(sourceId: string, sectionId: string, userId: string): Promise<ReadinessResult> {
    const cards = throwIfFailed(await studyCardRepository.findBySection(sourceId, sectionId, userId), 'readiness.sectionCards');
    const sourceDerived = cards.filter((c) => !c.generatedContent);
    const stateResults = await Promise.all(
      sourceDerived.map((c) => reviewRepository.findStateByCard(c.id, userId)),
    );
    const statesByCard = new Map<string, ReviewState>();
    stateResults.forEach((r, i) => {
      if (r.success && r.data) statesByCard.set(sourceDerived[i].id, r.data);
    });
    const fullCards = toReadinessCards(sourceDerived, statesByCard);
    return calculateReadiness({
      cards: fullCards,
      totalEligibleCards: fullCards.length,
      now: new Date().toISOString(),
    });
  },

  /** Expose the current calculation version for the UI. */
  get version(): string {
    return CALCULATION_VERSION;
  },
};
