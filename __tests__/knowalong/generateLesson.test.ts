// __tests__/knowalong/generateLesson.test.ts
// Pure-function tests for the adaptive generator. Assertions are structural
// (sizes, sources, no-dupes, issue inclusion) so they hold regardless of
// tie-break order — the generator is deterministic but the tests don't
// depend on which equal-ranked phrase wins.

import { describe, it, expect } from 'vitest';
import {
  buildCorpus,
  stepFromLearningItem,
  generateAdaptiveLesson,
  TARGET_LESSON_SIZE,
} from '../../utils/knowalong/generateLesson';
import { WORD_FADE_THRESHOLD, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import { LEARNING_ITEMS } from '../../utils/knowalong/fixtures/learningItems';

function graduated(over: Partial<WordMastery> = {}): WordMastery {
  return { exposures: 6, correct: 5, streak: WORD_FADE_THRESHOLD, mistakes: 0, lastSeenMs: 1, ...over };
}

const BASE_FORMS = new Set(LEARNING_ITEMS.map((i) => i.surfaceForm));

describe('buildCorpus', () => {
  it('is non-empty and spans the gradient + lyric phrases', () => {
    const corpus = buildCorpus();
    expect(corpus.length).toBeGreaterThan(0);
    expect(corpus.some((s) => s.surfaceForm === 'я')).toBe(true);   // gradient atom
    expect(corpus.some((s) => s.surfaceForm === 'эй')).toBe(true);  // Svetofor intro word
  });
});

describe('stepFromLearningItem', () => {
  it('carries transliteration + words through', () => {
    const item = LEARNING_ITEMS[1]; // 'я вижу'
    const step = stepFromLearningItem(item);
    expect(step.transliteration).toBe(item.transliteration);
    expect(step.words.length).toBe(item.words.length);
  });
});

describe('generateAdaptiveLesson', () => {
  it('returns TARGET_LESSON_SIZE phrases for a brand-new learner', () => {
    expect(generateAdaptiveLesson({}).length).toBe(TARGET_LESSON_SIZE);
  });

  it('respects a custom size', () => {
    expect(generateAdaptiveLesson({}, { size: 3 }).length).toBe(3);
  });

  it('starts the gradient with "я" for empty mastery', () => {
    expect(generateAdaptiveLesson({})[0].surfaceForm).toBe('я');
  });

  it('keeps Svetofor out while fewer than the threshold of words have graduated', () => {
    const mastery: MasteryMap = { я: graduated() }; // 1 graduated
    const lesson = generateAdaptiveLesson(mastery);
    expect(lesson.length).toBeGreaterThan(0);
    for (const s of lesson) {
      expect(BASE_FORMS.has(s.surfaceForm)).toBe(true);
    }
  });

  it('does not duplicate phrases within a lesson', () => {
    const lesson = generateAdaptiveLesson({});
    const ids = lesson.map((s) => s.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drills an issue word by including a phrase that contains it', () => {
    const mastery: MasteryMap = {
      вижу: { exposures: 3, correct: 0, streak: 0, mistakes: 4, lastSeenMs: 5 },
    };
    const lesson = generateAdaptiveLesson(mastery);
    const hitsIssue = lesson.some((s) => s.words.some((w) => w.form === 'вижу'));
    expect(hitsIssue).toBe(true);
  });

  it('never throws and never returns empty', () => {
    expect(() => generateAdaptiveLesson({})).not.toThrow();
    expect(generateAdaptiveLesson({ '??': graduated() }).length).toBeGreaterThan(0);
  });
});
