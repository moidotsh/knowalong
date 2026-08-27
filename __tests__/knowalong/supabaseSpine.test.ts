// __tests__/knowalong/supabaseSpine.test.ts
// Phase 6 (ADR: mastery-driven-generation-adr.md) — the Supabase
// SpineProvider seam. Pins the published-row → step mapping, the
// graceful-degradation contract (empty/failure → mock ladder), and the
// composition posture (only conceptSteps is replaced).

import { describe, it, expect } from 'vitest';
import {
  createSupabaseSpine,
  stepFromPublishedRealization,
} from '../../utils/knowalong/supabaseSpine';
import { createMockSpine } from '../../utils/knowalong/spine';
import type { ConceptRealization } from '../../shared/types/knowalong';

function makeRow(overrides: Partial<ConceptRealization> = {}): ConceptRealization {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    coreConceptId: 'concept-uuid-1',
    userId: null,
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'быть',
    gloss: 'to be',
    grammaticalNote: 'verb',
    lemmaId: null,
    grammarJson: null,
    examplesJson: null,
    ipa: '[bɨtʲ]',
    frequencyRank: 42,
    transliteration: 'byt\'',
    prerequisites: ['FIRST_PERSON'],
    enables: ['WANT'],
    createdAt: '2026-08-02T00:00:00Z',
    updatedAt: '2026-08-02T00:00:00Z',
    ...overrides,
  };
}

describe('stepFromPublishedRealization', () => {
  it('maps a full row to a renderable step', () => {
    const step = stepFromPublishedRealization(makeRow(), 'EXIST')!;
    expect(step.surfaceForm).toBe('быть');
    expect(step.meaning).toBe('to be');
    expect(step.transliteration).toBe('byt\'');
    expect(step.words).toEqual([
      { form: 'быть', gloss: 'to be', role: 'noun' },
    ]);
    expect(step.note).toBe('verb');
  });

  it('skips rows without a gloss (never render empty meaning)', () => {
    expect(stepFromPublishedRealization(makeRow({ gloss: null }), 'EXIST')).toBeNull();
    expect(stepFromPublishedRealization(makeRow({ gloss: '  ' }), 'EXIST')).toBeNull();
  });

  it('skips rows without a surface form', () => {
    expect(stepFromPublishedRealization(makeRow({ surfaceForm: '' }), 'EXIST')).toBeNull();
  });

  it('omits transliteration when the row has none', () => {
    const step = stepFromPublishedRealization(
      makeRow({ transliteration: null }),
      'EXIST',
    )!;
    expect(step.transliteration).toBeUndefined();
  });
});

describe('createSupabaseSpine (degradation contract)', () => {
  it('returns the mock spine when nothing is published (DEMO_MODE repository)', async () => {
    // No Supabase configured in tests → findPublishedByLanguage
    // resolves [] → the ADR's graceful fallback serves the mock ladder.
    const spine = await createSupabaseSpine('ru', 'test-user');
    const mock = createMockSpine('ru');
    expect(spine.conceptSteps().length).toBe(mock.conceptSteps().length);
    expect(spine.foundationalSteps()).toEqual(mock.foundationalSteps());
    expect(spine.lyricSteps()).toEqual(mock.lyricSteps());
  });

  it('keeps the language code from the mock (composition, not fork)', async () => {
    const spine = await createSupabaseSpine('ru', 'test-user');
    expect(spine.languageCode).toBe('ru');
  });
});
