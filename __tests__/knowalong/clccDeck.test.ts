// __tests__/knowalong/clccDeck.test.ts
// Structure tests for the CLCC deck family built from clccSeed.ts.

import { describe, it, expect } from 'vitest';
import { CLCC_DECK, ALL_CLCC_STEPS, buildClccDeck } from '../../utils/knowalong/fixtures/clccDeck';
import { CLCC_SEED } from '../../utils/knowalong/fixtures/clccSeed';
import type { StepMode } from '../../utils/knowalong/fixtures/decks';

describe('CLCC_DECK structure', () => {
  it('has 5 tier-band sub-decks, each with non-empty lessons', () => {
    expect(CLCC_DECK.id).toBe('clcc-deck');
    expect(CLCC_DECK.subDecks?.length).toBe(5);
    for (const sd of CLCC_DECK.subDecks ?? []) {
      expect(sd.lessons.length).toBeGreaterThan(0);
      for (const l of sd.lessons) {
        expect(l.steps.length).toBeGreaterThan(0);
        expect(l.stepCount).toBe(l.steps.length);
      }
    }
  });

  it('deck.lessons is the flattened union of sub-deck lessons', () => {
    const flat = (CLCC_DECK.subDecks ?? []).flatMap((sd) => sd.lessons);
    expect(CLCC_DECK.lessons.length).toBe(flat.length);
  });

  it('never reuses a step id or lesson id', () => {
    const stepIds = ALL_CLCC_STEPS.map((s) => s.itemId);
    expect(new Set(stepIds).size).toBe(stepIds.length);
    const lessonIds = CLCC_DECK.lessons.map((l) => l.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });
});

describe('ALL_CLCC_STEPS coverage', () => {
  it('covers every seed concept (one step per row)', () => {
    expect(ALL_CLCC_STEPS.length).toBe(CLCC_SEED.length);
  });

  it('carries all three interaction modes', () => {
    const modes = new Set<StepMode>(ALL_CLCC_STEPS.map((s) => s.mode ?? 'build'));
    expect(modes.has('build')).toBe(true);
    expect(modes.has('reverse')).toBe(true);
    expect(modes.has('cloze')).toBe(true);
  });

  it('cloze steps carry prompt/answer/meaning; build/reverse do not', () => {
    for (const s of ALL_CLCC_STEPS) {
      const mode = s.mode ?? 'build';
      if (mode === 'cloze') {
        expect(s.clozePrompt).toBeTruthy();
        expect(s.clozeAnswer).toBeTruthy();
        expect(s.clozeMeaning).toBeTruthy();
        expect(s.clozePrompt).toContain('___');
      } else {
        expect(s.clozePrompt).toBeUndefined();
      }
    }
  });

  it('cloze answer is a word present in the step decomposition', () => {
    for (const s of ALL_CLCC_STEPS) {
      if ((s.mode ?? 'build') === 'cloze') {
        const forms = s.words.map((w) => w.form);
        expect(forms).toContain(s.clozeAnswer);
      }
    }
  });
});

describe('buildClccDeck determinism', () => {
  it('two builds produce equal decks', () => {
    const a = buildClccDeck();
    const b = buildClccDeck();
    expect(a.id).toBe(b.id);
    expect(a.lessons.length).toBe(b.lessons.length);
    expect(a.lessons.map((l) => l.id)).toEqual(b.lessons.map((l) => l.id));
  });
});
