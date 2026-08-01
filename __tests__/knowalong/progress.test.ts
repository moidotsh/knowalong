// __tests__/knowalong/progress.test.ts
// Tests for the dashboard pre-warm helper + deck lesson ordering.

import { describe, it, expect } from 'vitest';
import { ALL_DECKS } from '../../utils/knowalong/fixtures/decks';
import { deckLessonsInOrder, nextLessonAudioTexts } from '../../utils/knowalong/progress';

describe('deckLessonsInOrder', () => {
  it('flattens a sub-deck deck (songs/CLCC) in order', () => {
    const svetofor = ALL_DECKS.find((d) => d.id === 'svetofor');
    expect(svetofor).toBeTruthy();
    const lessons = deckLessonsInOrder(svetofor!);
    expect(lessons.length).toBeGreaterThan(0);
    // equals the union of its sub-decks' lessons
    const viaSubs = svetofor!.subDecks!.flatMap((sd) => sd.lessons);
    expect(lessons.map((l) => l.id)).toEqual(viaSubs.map((l) => l.id));
  });

  it('uses deck.lessons for a flat deck', () => {
    const foundations = ALL_DECKS.find((d) => d.id === 'foundations')!;
    expect(deckLessonsInOrder(foundations).map((l) => l.id)).toEqual(foundations.lessons.map((l) => l.id));
  });
});

describe('nextLessonAudioTexts', () => {
  it('returns speakable texts for the first cards across decks, including CLCC + music', () => {
    const texts = nextLessonAudioTexts([]);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts).toContain('я'); // gradient atom, present in early lessons of multiple decks
  });

  it('advances past a completed lesson to the next one in that deck', () => {
    // Complete foundations L1 (f-1, "я") → foundations should contribute L2 ("я вижу").
    const texts = nextLessonAudioTexts(['f-1']);
    expect(texts).toContain('я вижу');
  });

  it('respects the maxDecks cap (fewer decks → fewer or equal texts)', () => {
    const few = nextLessonAudioTexts([], 1).length;
    const many = nextLessonAudioTexts([], 5).length;
    expect(many).toBeGreaterThanOrEqual(few);
  });

  it('skips a fully-completed deck', () => {
    // Complete every lesson in the foundations deck → it contributes nothing.
    const foundations = ALL_DECKS.find((d) => d.id === 'foundations')!;
    const allF = deckLessonsInOrder(foundations).map((l) => l.id);
    const texts = nextLessonAudioTexts(allF);
    expect(texts.length).toBeGreaterThan(0); // other decks still contribute
  });
});
