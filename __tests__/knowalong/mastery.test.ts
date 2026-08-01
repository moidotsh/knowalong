// __tests__/knowalong/mastery.test.ts
// Pure-function tests for the per-word mastery model: fade threshold,
// classification, phrase readiness, and the summary aggregation.

import { describe, it, expect } from 'vitest';
import {
  WORD_FADE_THRESHOLD,
  wordKey,
  classifyWord,
  shouldShowGloss,
  streakProgress,
  summarizeMastery,
  phraseReadiness,
  type WordMastery,
  type MasteryMap,
} from '../../utils/knowalong/mastery';
import { buildCorpus } from '../../utils/knowalong/generateLesson';

function mw(over: Partial<WordMastery> = {}): WordMastery {
  return { exposures: 1, correct: 0, streak: 0, mistakes: 0, lastSeenMs: null, ...over };
}

describe('shouldShowGloss', () => {
  it('shows the gloss for an unseen word', () => {
    expect(shouldShowGloss(undefined)).toBe(true);
  });
  it('shows the gloss while streak is below the threshold', () => {
    expect(shouldShowGloss(mw({ streak: WORD_FADE_THRESHOLD - 1 }))).toBe(true);
  });
  it('hides the gloss once streak reaches the threshold', () => {
    expect(shouldShowGloss(mw({ streak: WORD_FADE_THRESHOLD }))).toBe(false);
    expect(shouldShowGloss(mw({ streak: WORD_FADE_THRESHOLD + 3 }))).toBe(false);
  });
});

describe('classifyWord', () => {
  it('classifies unseen words as new', () => {
    expect(classifyWord(undefined)).toBe('new');
    expect(classifyWord(mw({ exposures: 0 }))).toBe('new');
  });
  it('classifies a threshold streak as graduated', () => {
    expect(classifyWord(mw({ streak: WORD_FADE_THRESHOLD }))).toBe('graduated');
  });
  it('classifies a seen word with mistakes as an issue', () => {
    expect(classifyWord(mw({ mistakes: 1, streak: 2 }))).toBe('issue');
  });
  it('classifies a clean in-progress word as learning', () => {
    expect(classifyWord(mw({ streak: 2, mistakes: 0 }))).toBe('learning');
  });
});

describe('wordKey', () => {
  it('trims surrounding whitespace', () => {
    expect(wordKey('  я  ')).toBe('я');
  });
});

describe('streakProgress', () => {
  it('clamps at the threshold and defaults unseen to 0', () => {
    expect(streakProgress(mw({ streak: 99 }))).toBe(WORD_FADE_THRESHOLD);
    expect(streakProgress(undefined)).toBe(0);
  });
});

describe('phraseReadiness', () => {
  it('counts every word unknown against empty mastery', () => {
    const step = buildCorpus()[0];
    const r = phraseReadiness(step, {});
    expect(r.unknownCount).toBe(step.words.length);
    expect(r.knownRatio).toBe(0);
  });
  it('counts a graduated word as known and drops it from unknown', () => {
    const step = buildCorpus()[0];
    const firstForm = step.words[0].form;
    const mastery: MasteryMap = { [firstForm]: mw({ streak: WORD_FADE_THRESHOLD }) };
    const r = phraseReadiness(step, mastery);
    expect(r.graduatedCount).toBe(1);
    expect(r.unknownCount).toBe(step.words.length - 1);
  });
});

describe('summarizeMastery', () => {
  it('counts graduated, learning, and issue buckets and ranks issue words', () => {
    const forms = ['я', 'вижу', 'море', 'чай'];
    const mastery: MasteryMap = {
      я: mw({ streak: WORD_FADE_THRESHOLD }),   // graduated
      вижу: mw({ streak: 2 }),                    // learning
      море: mw({ streak: 1, mistakes: 3 }),       // issue (worst)
      чай: mw({ exposures: 0 }),                  // new — not counted
    };
    const s = summarizeMastery(forms, mastery);
    expect(s.seen).toBe(3);
    expect(s.graduated).toBe(1);
    expect(s.learning).toBe(2);
    expect(s.issue).toBe(1);
    expect(s.issueWords[0].form).toBe('море');
  });
});
