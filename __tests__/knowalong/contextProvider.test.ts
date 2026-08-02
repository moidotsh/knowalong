// __tests__/knowalong/contextProvider.test.ts
// Phase 4.1 — the ContextProvider seam. Pins the mock (lyric-window derivation +
// morphology-safe particle pairing): every returned phrase is a multi-word (≤3)
// real slice that includes the target, and particles with a 1-word line still get
// external clause context.

import { describe, it, expect } from 'vitest';
import { getContext } from '../../utils/knowalong/contextProvider';
import { wordKey } from '../../utils/knowalong/mastery';
import type { WordPart } from '../../utils/knowalong/fixtures/learningItems';

const context = getContext();

describe('mock ContextProvider — contextPhrasesFor', () => {
  it('returns multi-word lyric windows (≤3 words) that include the target', () => {
    const phrases = context.contextPhrasesFor({ form: 'фантомом', gloss: 'phantom', role: 'noun' });
    expect(phrases.length).toBeGreaterThan(0);
    for (const p of phrases) {
      expect(p.words.length).toBeGreaterThanOrEqual(2);
      expect(p.words.length).toBeLessThanOrEqual(3);
      expect(p.words.some((w) => wordKey(w.form) === 'фантомом')).toBe(true);
    }
  });

  it('a particle in a 1-word lyric line still gets multi-word external context', () => {
    // эй's only lyric line is the 1-word "Эй" → no window, but particle pairing
    // yields «эй я вижу»-style clauses (morphology-safe).
    const phrases = context.contextPhrasesFor({ form: 'эй', gloss: 'hey', role: 'particle' });
    expect(phrases.length).toBeGreaterThan(0);
    for (const p of phrases) {
      expect(p.words.length).toBeGreaterThanOrEqual(2);
      expect(p.surfaceForm.startsWith('эй')).toBe(true);
    }
  });

  it('returns [] for a word in no lyric line and not a particle', () => {
    const phrases = context.contextPhrasesFor({ form: 'ктулху', gloss: 'cthulhu', role: 'noun' } as WordPart);
    expect(phrases).toEqual([]);
  });

  it('is deterministic — same target yields the same phrases', () => {
    const a = context.contextPhrasesFor({ form: 'полетев', gloss: 'having flown', role: 'verb' });
    const b = context.contextPhrasesFor({ form: 'полетев', gloss: 'having flown', role: 'verb' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
