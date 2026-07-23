// utils/supabase/repositories/reviewRepository.ts
// Repository for review_states + review_attempts. States are scoped via
// EXISTS through study_cards.user_id; attempts carry user_id directly.

import type { ReviewState, ReviewAttempt, RecordReviewAttemptDTO } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, validateWithSchema, unauthorized } from './types';
import { RecordReviewAttemptSchema } from '../../../shared/types/knowalong';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface ReviewStateRow {
  card_id: string;
  card_status: string;
  due_at: string | null;
  interval_days: number | null;
  ease_factor: number | null;
  repetitions: number;
  lapses: number;
  last_reviewed_at: string | null;
  updated_at: string;
}

interface ReviewAttemptRow {
  id: string;
  user_id: string;
  card_id: string;
  rating: string;
  reviewed_at: string;
  time_spent_ms: number | null;
}

function toReviewState(row: ReviewStateRow): ReviewState {
  return {
    cardId: row.card_id,
    cardStatus: row.card_status as ReviewState['cardStatus'],
    dueAt: row.due_at,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    repetitions: row.repetitions,
    lapses: row.lapses,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
  };
}

function toReviewAttempt(row: ReviewAttemptRow): ReviewAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    cardId: row.card_id,
    rating: row.rating as ReviewAttempt['rating'],
    reviewedAt: row.reviewed_at,
    timeSpentMs: row.time_spent_ms,
  };
}

async function findStateByCard(cardId: string, userId: string): Promise<RepositoryResult<ReviewState | null>> {
  if (DEMO_MODE) return demoAdapter.review.findStateByCard(cardId, userId);
  if (!cardId || !userId) return unauthorized('Missing card id or user id');
  try {
    const { data, error } = await supabase
      .from('review_states')
      .select('*, card:study_cards!inner(user_id)')
      .eq('card_id', cardId)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? toReviewState(data as unknown as ReviewStateRow) : null);
  } catch (e) {
    return handleRepositoryError('review.findStateByCard', e);
  }
}

async function upsertState(cardId: string, userId: string, patch: Partial<ReviewStateRow>): Promise<RepositoryResult<ReviewState>> {
  if (DEMO_MODE) return demoAdapter.review.upsertState(cardId, userId, patch);
  if (!cardId || !userId) return unauthorized('Missing card id or user id');
  try {
    const { data, error } = await supabase
      .from('review_states')
      .upsert({ card_id: cardId, ...patch })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toReviewState(data as ReviewStateRow));
  } catch (e) {
    return handleRepositoryError('review.upsertState', e);
  }
}

/** Record a review attempt + advance the card's scheduler state. Provisional (not full FSRS). */
async function recordAttempt(userId: string, input: RecordReviewAttemptDTO): Promise<RepositoryResult<{
  attempt: ReviewAttempt;
  state: ReviewState;
}>> {
  if (DEMO_MODE) return demoAdapter.review.recordAttempt(userId, input);
  if (!userId) return unauthorized('Missing user id');
  const validated = validateWithSchema(RecordReviewAttemptSchema, input);
  if (!validated.success) return validated;
  try {
    const { cardId, rating, timeSpentMs } = validated.data;
    const nowIso = new Date().toISOString();

    // Provisional scheduler transition (not FSRS): again → learning + lapse;
    // hard → learning; good → review + interval 1d; easy → review + interval 3d.
    const isAgain = rating === 'again';
    const isHard = rating === 'hard';
    const isGood = rating === 'good';
    const nextStatus = isAgain || isHard ? 'learning' : 'review';
    const nextInterval = isGood ? 1 : isAgain || isHard ? 0 : 3;
    const nextEase = isAgain ? 2.3 : 2.5;
    const nextDue = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

    // Fetch current state for repetitions/lapses accumulation.
    const { data: existing } = await supabase
      .from('review_states')
      .select('*')
      .eq('card_id', cardId)
      .maybeSingle();
    const prev = (existing as ReviewStateRow | null) ?? null;
    const nextReps = (prev?.repetitions ?? 0) + (isAgain ? 0 : 1);
    const nextLapses = (prev?.lapses ?? 0) + (isAgain ? 1 : 0);

    const [attemptRes, stateRes] = await Promise.all([
      supabase.from('review_attempts').insert({
        user_id: userId,
        card_id: cardId,
        rating,
        reviewed_at: nowIso,
        time_spent_ms: timeSpentMs ?? null,
      }).select('*').single(),
      supabase.from('review_states').upsert({
        card_id: cardId,
        card_status: nextStatus,
        due_at: nextDue,
        interval_days: nextInterval,
        ease_factor: nextEase,
        repetitions: nextReps,
        lapses: nextLapses,
        last_reviewed_at: nowIso,
      }).select('*').single(),
    ]);
    if (attemptRes.error) throw attemptRes.error;
    if (stateRes.error) throw stateRes.error;

    return ok({
      attempt: toReviewAttempt(attemptRes.data as ReviewAttemptRow),
      state: toReviewState(stateRes.data as ReviewStateRow),
    });
  } catch (e) {
    return handleRepositoryError('review.recordAttempt', e);
  }
}

export const reviewRepository = {
  findStateByCard,
  upsertState,
  recordAttempt,
};

export { toReviewState, toReviewAttempt, type ReviewStateRow, type ReviewAttemptRow };
