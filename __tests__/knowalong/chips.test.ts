// __tests__/knowalong/chips.test.ts
// Pure-function tests for the mode-aware chip builder. Counts/properties are
// asserted (not order — the builder shuffles with Math.random per call).

import { describe, it, expect } from 'vitest';
import { buildChipsForStep, getWordPool, type Chip } from '../../utils/knowalong/fixtures/chips';
import type { LessonStep } from '../../utils/knowalong/fixtures/decks';

function buildStep(): LessonStep {
  return {
    itemId: 't-build',
    surfaceForm: 'я вижу',
    meaning: 'I see',
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
    ],
    mode: 'build',
  };
}

function reverseStep(): LessonStep {
  return {
    itemId: 't-reverse',
    surfaceForm: 'я вижу',
    meaning: 'I see',
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
    ],
    mode: 'reverse',
  };
}

function clozeStep(): LessonStep {
  return {
    itemId: 't-cloze',
    surfaceForm: 'Я вижу море.',
    meaning: 'I see the sea.',
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
      { form: 'море', gloss: 'sea', role: 'noun' },
    ],
    mode: 'cloze',
    clozePrompt: 'Я ___ море.',
    clozeAnswer: 'вижу',
    clozeMeaning: 'I see the sea.',
  };
}

describe('getWordPool', () => {
  it('aggregates gradient + CLCC + Svetofor words, deduped by form', () => {
    const pool = getWordPool();
    expect(pool.length).toBeGreaterThan(0);
    // gradient atom
    expect(pool.some((w) => w.form === 'я')).toBe(true);
    // CLCC headword
    expect(pool.some((w) => w.form === 'быть')).toBe(true);
    // dedupe: one entry per form
    expect(new Set(pool.map((w) => w.form)).size).toBe(pool.length);
  });
});

describe('buildChipsForStep — build mode', () => {
  it('emits one correct chip per word (in order) + distractors', () => {
    const chips = buildChipsForStep(buildStep());
    const correct = chips.filter((c) => c.isCorrect);
    expect(correct.length).toBe(2);
    expect(correct.map((c) => c.correctPosition).sort((a, b) => a - b)).toEqual([0, 1]);
    // distractors: max(2, 5 - 2) = 3
    expect(chips.filter((c) => !c.isCorrect).length).toBe(3);
    // distractors are not the target forms
    for (const d of chips.filter((c) => !c.isCorrect)) {
      expect(d.form === 'я' || d.form === 'вижу').toBe(false);
    }
  });
});

describe('buildChipsForStep — reverse mode', () => {
  it('emits EN-token correct chips from `meaning` + EN distractors', () => {
    const chips = buildChipsForStep(reverseStep());
    const correct = chips.filter((c) => c.isCorrect);
    expect(correct.length).toBe(2); // "i", "see"
    expect(correct.map((c) => c.form).sort()).toEqual(['i', 'see']);
    expect(correct.map((c) => c.correctPosition).sort((a, b) => a - b)).toEqual([0, 1]);
    // distractors are latin (english glosses), not cyrillic
    for (const d of chips.filter((c) => !c.isCorrect)) {
      expect(/^[a-z]/.test(d.form)).toBe(true);
    }
  });
});

describe('buildChipsForStep — cloze mode', () => {
  it('emits exactly one correct chip + same-role distractors', () => {
    const chips: Chip[] = buildChipsForStep(clozeStep());
    const correct = chips.filter((c) => c.isCorrect);
    expect(correct.length).toBe(1);
    expect(correct[0].form).toBe('вижу');
    expect(correct[0].role).toBe('verb');
    const distractors = chips.filter((c) => !c.isCorrect);
    expect(distractors.length).toBeGreaterThanOrEqual(2);
    // every distractor matches the answer's role and is a different form
    for (const d of distractors) {
      expect(d.role).toBe('verb');
      expect(d.form).not.toBe('вижу');
    }
  });
});

describe('buildChipsForStep — default mode', () => {
  it('treats absent mode as build', () => {
    const step = buildStep();
    delete step.mode;
    const chips = buildChipsForStep(step);
    const correct = chips.filter((c) => c.isCorrect);
    expect(correct.length).toBe(2);
    expect(correct.every((c) => c.correctPosition >= 0)).toBe(true);
  });
});
