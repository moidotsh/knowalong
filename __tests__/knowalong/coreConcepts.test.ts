// __tests__/knowalong/coreConcepts.test.ts
// Core concept framework tests: tier range, realization types, concept seed
// validation.

import { describe, it, expect } from 'vitest';
import { demoCoreConcepts } from '../../shared/fixtures';
import { ConceptRealizationSchema } from '../../shared/types/knowalong/schemas';

describe('Core Concept catalog', () => {
  it('contains seeded concepts', () => {
    expect(demoCoreConcepts.length).toBeGreaterThanOrEqual(5);
  });

  it('all concept tiers are between 0 and 3', () => {
    for (const c of demoCoreConcepts) {
      expect(c.tier).toBeGreaterThanOrEqual(0);
      expect(c.tier).toBeLessThanOrEqual(3);
    }
  });

  it('every concept has a unique code', () => {
    const codes = demoCoreConcepts.map((c) => c.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('every concept has a canonical label and description', () => {
    for (const c of demoCoreConcepts) {
      expect(c.canonicalLabel.length).toBeGreaterThan(0);
      expect(c.description).not.toBeNull();
      expect((c.description ?? '').length).toBeGreaterThan(0);
    }
  });

  it('includes expected Core 0 concepts (FIRST_PERSON, EXIST)', () => {
    const codes = demoCoreConcepts.map((c) => c.code);
    expect(codes).toContain('FIRST_PERSON');
    expect(codes).toContain('EXIST');
  });
});

describe('Concept realizations', () => {
  const validBase = {
    coreConceptId: 'concept-first-person',
    languageCode: 'ru',
    surfaceForm: 'я',
  };

  it('accepts a word realization with a lemma', () => {
    const result = ConceptRealizationSchema.safeParse({
      ...validBase,
      realizationType: 'word',
      lemmaId: 'lemma-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a phrase realization without a lemma', () => {
    const result = ConceptRealizationSchema.safeParse({
      ...validBase,
      realizationType: 'phrase',
      surfaceForm: 'у меня есть',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lemmaId).toBeNull();
    }
  });

  it('accepts a construction realization', () => {
    const result = ConceptRealizationSchema.safeParse({
      ...validBase,
      realizationType: 'construction',
      surfaceForm: 'чтобы + infinitive',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a feature realization (e.g. grammatical gender)', () => {
    const result = ConceptRealizationSchema.safeParse({
      ...validBase,
      realizationType: 'feature',
      surfaceForm: 'masculine gender',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid realization type', () => {
    const result = ConceptRealizationSchema.safeParse({
      ...validBase,
      realizationType: 'clause',
    });
    expect(result.success).toBe(false);
  });
});
