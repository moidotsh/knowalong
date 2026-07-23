// __tests__/knowalong/reviewTransition.test.ts
// Provisional scheduler transition tests (not full FSRS).
// Verifies the demoAdapter's rating → next-state mapping.

import { describe, it, expect } from 'vitest';
import { demoAdapter, resetDemoState, DEMO_USER_ID } from '../../utils/supabase/repositories';

describe('Review transition (provisional scheduler)', () => {
  it('again → learning status, 0 interval, lapse++', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-src-1',
      rating: 'again',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.cardStatus).toBe('learning');
      expect(result.data.state.intervalDays).toBe(0);
      expect(result.data.state.lapses).toBeGreaterThanOrEqual(1);
    }
  });

  it('hard → learning status, 0 interval', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-src-2',
      rating: 'hard',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.cardStatus).toBe('learning');
      expect(result.data.state.intervalDays).toBe(0);
    }
  });

  it('good → review status, 1-day interval, repetitions++', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-src-3',
      rating: 'good',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.cardStatus).toBe('review');
      expect(result.data.state.intervalDays).toBe(1);
      expect(result.data.state.repetitions).toBeGreaterThanOrEqual(1);
    }
  });

  it('easy → review status, 3-day interval', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-gen-1',
      rating: 'easy',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.cardStatus).toBe('review');
      expect(result.data.state.intervalDays).toBe(3);
    }
  });

  it('again lowers ease factor to 2.3', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-src-1',
      rating: 'again',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.easeFactor).toBe(2.3);
    }
  });

  it('good/easy sets ease factor to 2.5', async () => {
    resetDemoState();
    const result = await demoAdapter.review.recordAttempt(DEMO_USER_ID, {
      cardId: 'card-src-2',
      rating: 'good',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.easeFactor).toBe(2.5);
    }
  });
});
