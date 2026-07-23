// services/reviewService.ts
// Review session service. getDueQueue fetches due cards; submitReview
// records the attempt, advances the scheduler state, and the caller
// (hook mutation) invalidates readiness.

import type { StudyCard, RecordReviewAttemptDTO, ReviewState } from '../shared/types/knowalong';
import { studyCardRepository, reviewRepository, throwIfFailed } from '../utils/supabase/repositories';

export interface SubmitReviewResult {
  state: ReviewState;
}

export const reviewService = {
  async getDueQueue(userId: string, limit: number = 20): Promise<StudyCard[]> {
    const result = await studyCardRepository.findDueQueue(userId, limit);
    return throwIfFailed(result, 'getDueQueue');
  },

  async submitReview(userId: string, input: RecordReviewAttemptDTO): Promise<SubmitReviewResult> {
    const result = await reviewRepository.recordAttempt(userId, input);
    const data = throwIfFailed(result, 'submitReview');
    return { state: data.state };
  },
};
