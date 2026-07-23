// __tests__/knowalong/schemas.test.ts
// Zod schema validation: LyricDraft, ConceptRealization, DifficultyBudget,
// RecordReviewAttempt, UpdateLearningSource.

import { describe, it, expect } from 'vitest';
import {
  LyricDraftSchema,
  RecordReviewAttemptSchema,
  ConceptRealizationSchema,
  DifficultyBudgetSchema,
  UpdateLearningSourceSchema,
  MAX_LYRIC_TEXT_BYTES,
} from '../../shared/types/knowalong/schemas';

describe('LyricDraftSchema', () => {
  const validInput = {
    sourceType: 'lyrics' as const,
    title: 'Звёздная река',
    artist: 'Ансамбль Тихий Свет',
    targetLanguage: 'ru',
    translationLanguage: 'en',
    rawText: 'Звёздная река течёт по небу',
  };

  it('accepts valid input with all fields', () => {
    const result = LyricDraftSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults translationLanguage to "en" when omitted', () => {
    const { translationLanguage: _omitted, ...withoutLang } = validInput;
    const result = LyricDraftSchema.safeParse(withoutLang);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translationLanguage).toBe('en');
    }
  });

  it('defaults artist and notes to null when omitted', () => {
    const { artist: _a, ...minimal } = validInput;
    const result = LyricDraftSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.artist).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it('rejects empty rawText', () => {
    const result = LyricDraftSchema.safeParse({ ...validInput, rawText: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = LyricDraftSchema.safeParse({ ...validInput, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects targetLanguage shorter than 2 chars', () => {
    const result = LyricDraftSchema.safeParse({ ...validInput, targetLanguage: 'r' });
    expect(result.success).toBe(false);
  });

  it('rejects rawText exceeding 100KB', () => {
    const huge = 'а'.repeat(MAX_LYRIC_TEXT_BYTES + 1);
    const result = LyricDraftSchema.safeParse({ ...validInput, rawText: huge });
    expect(result.success).toBe(false);
  });
});

describe('RecordReviewAttemptSchema', () => {
  it('accepts valid input', () => {
    const result = RecordReviewAttemptSchema.safeParse({
      cardId: 'card-1',
      rating: 'good',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional timeSpentMs', () => {
    const result = RecordReviewAttemptSchema.safeParse({
      cardId: 'card-1',
      rating: 'again',
      timeSpentMs: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid rating', () => {
    const result = RecordReviewAttemptSchema.safeParse({
      cardId: 'card-1',
      rating: 'medium',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty cardId', () => {
    const result = RecordReviewAttemptSchema.safeParse({
      cardId: '',
      rating: 'good',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative timeSpentMs', () => {
    const result = RecordReviewAttemptSchema.safeParse({
      cardId: 'card-1',
      rating: 'good',
      timeSpentMs: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('ConceptRealizationSchema', () => {
  it('accepts a word realization with a lemma', () => {
    const result = ConceptRealizationSchema.safeParse({
      coreConceptId: 'concept-1',
      languageCode: 'ru',
      realizationType: 'word',
      surfaceForm: 'я',
      gloss: 'I',
      lemmaId: 'lemma-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a phrase realization without a lemma', () => {
    const result = ConceptRealizationSchema.safeParse({
      coreConceptId: 'concept-1',
      languageCode: 'ru',
      realizationType: 'phrase',
      surfaceForm: 'у меня есть',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lemmaId).toBeNull();
    }
  });

  it('rejects invalid realizationType', () => {
    const result = ConceptRealizationSchema.safeParse({
      coreConceptId: 'concept-1',
      languageCode: 'ru',
      realizationType: 'sentence',
      surfaceForm: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty surfaceForm', () => {
    const result = ConceptRealizationSchema.safeParse({
      coreConceptId: 'concept-1',
      languageCode: 'ru',
      realizationType: 'word',
      surfaceForm: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('DifficultyBudgetSchema', () => {
  it('accepts a budget with one known target', () => {
    const result = DifficultyBudgetSchema.safeParse({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
      maxUnknownTargets: 1,
      minTargets: 1,
    });
    expect(result.success).toBe(true);
  });

  it('defaults maxUnknownTargets to 1 and minTargets to 1', () => {
    const result = DifficultyBudgetSchema.safeParse({
      targets: [{ coreConceptCode: 'EXIST', isKnown: true }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxUnknownTargets).toBe(1);
      expect(result.data.minTargets).toBe(1);
    }
  });

  it('rejects empty targets array', () => {
    const result = DifficultyBudgetSchema.safeParse({
      targets: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateLearningSourceSchema', () => {
  it('accepts a partial update', () => {
    const result = UpdateLearningSourceSchema.safeParse({ title: 'New title' });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields)', () => {
    const result = UpdateLearningSourceSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts processingStatus transition', () => {
    const result = UpdateLearningSourceSchema.safeParse({ processingStatus: 'archived' });
    expect(result.success).toBe(true);
  });
});
