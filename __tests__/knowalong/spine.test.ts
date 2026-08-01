// __tests__/knowalong/spine.test.ts
// Phase 2 (ADR: mastery-driven-generation-adr.md) — the SpineProvider seam.
// Pins that the three corpus layers are reachable through the seam and that
// the seam is the sole source of the generator's corpus (the Phase 2 exit
// criterion): buildCorpus()'s surface forms are exactly the union of the three
// spine layers. Also pins stepFromLearningItem, relocated here from the
// generateLesson suite (the spine now owns the LearningItem → step mapping).

import { describe, it, expect } from 'vitest';
import { getSpine, createMockSpine, stepFromLearningItem } from '../../utils/knowalong/spine';
import { buildCorpus } from '../../utils/knowalong/generateLesson';
import { LEARNING_ITEMS } from '../../utils/knowalong/fixtures/learningItems';

describe('getSpine (mock, v1)', () => {
  it('serves Russian and exposes the three non-empty corpus layers', () => {
    const spine = getSpine();
    expect(spine.languageCode).toBe('ru');
    expect(spine.foundationalSteps().length).toBeGreaterThan(0);
    expect(spine.conceptSteps().length).toBeGreaterThan(0);
    expect(spine.lyricSteps().length).toBeGreaterThan(0);
  });

  it('foundationalSteps spans the gradient (the atom layer, no prerequisites)', () => {
    const forms = new Set(getSpine().foundationalSteps().map((s) => s.surfaceForm));
    expect(forms.has('я')).toBe(true);
    expect(forms.has('я вижу')).toBe(true);
  });

  it('conceptSteps carries the CLCC ladder (the majority scaffolding spine)', () => {
    const forms = new Set(getSpine().conceptSteps().map((s) => s.surfaceForm));
    expect(forms.has('быть')).toBe(true);
  });

  it('lyricSteps carries the Svetofor targets', () => {
    const forms = new Set(getSpine().lyricSteps().map((s) => s.surfaceForm));
    expect(forms.has('эй')).toBe(true);
  });

  it('is the sole source of buildCorpus — seam reachability (Phase 2 exit)', () => {
    const spine = getSpine();
    const seamForms = new Set<string>();
    for (const s of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.lyricSteps()]) {
      seamForms.add(s.surfaceForm);
    }
    const corpusForms = new Set(buildCorpus().map((s) => s.surfaceForm));
    // buildCorpus dedupes by surfaceForm, so its forms are exactly the seam union.
    for (const f of corpusForms) expect(seamForms.has(f)).toBe(true);
    for (const f of seamForms) expect(corpusForms.has(f)).toBe(true);
  });
});

describe('createMockSpine', () => {
  it('builds a spine for a given language code whose gradient matches the fixture', () => {
    const spine = createMockSpine('ru');
    expect(spine.languageCode).toBe('ru');
    expect(spine.foundationalSteps().length).toBe(LEARNING_ITEMS.length);
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
