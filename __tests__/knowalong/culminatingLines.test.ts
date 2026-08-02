// __tests__/knowalong/culminatingLines.test.ts
// Phase 5 (ADR) — mastery-gated culminating line lessons. Pins the strict gate
// (locked until every line word is graduated), the lesson shape (full-line card,
// cap-safe), resolution, and determinism.

import { describe, it, expect } from 'vitest';
import {
  buildCulminatingLines,
  resolveCulminatingLineLesson,
  culminatingLineLessonId,
  isCulminatingLineLessonId,
  isLineUnlocked,
} from '../../utils/knowalong/culminatingLines';
import { SVETOFOR_SUBDECKS } from '../../utils/knowalong/fixtures/svetoforFullDeck';
import { SVETOFOR_SONG } from '../../utils/knowalong/fixtures/svetoforSong';
import { assertLessonWithinCap } from '../../utils/knowalong/concept';
import { WORD_FADE_THRESHOLD, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';

const T = WORD_FADE_THRESHOLD;
const grad: WordMastery = { exposures: 1, correct: T, streak: T, mistakes: 0, lastSeenMs: 1 };
const intro = SVETOFOR_SUBDECKS.find((s) => s.id === 'sv-intro')!;
const introLine2 = SVETOFOR_SONG.sections.find((s) => s.id === 'intro')!.lines[1]; // будто полетев фантомом

/** Mastery graduating exactly the given forms. */
function graduating(...forms: string[]): MasteryMap {
  const m: MasteryMap = {};
  for (const f of forms) m[wordKey(f)] = grad;
  return m;
}

describe('isLineUnlocked', () => {
  it('unlocked when every word is graduated', () => {
    expect(isLineUnlocked(introLine2, graduating('будто', 'полетев', 'фантомом'))).toBe(true);
  });
  it('locked when any word is missing', () => {
    expect(isLineUnlocked(introLine2, graduating('будто', 'полетев'))).toBe(false);
  });
  it('locked for empty mastery', () => {
    expect(isLineUnlocked(introLine2, {})).toBe(false);
  });
});

describe('buildCulminatingLines', () => {
  it('locks a line until all its words graduate; reports missingCount', () => {
    const lines = buildCulminatingLines(intro, {});
    const line2 = lines.find((l) => l.ordinal === introLine2.ordinal)!;
    expect(line2.unlocked).toBe(false);
    expect(line2.lesson).toBeNull();
    expect(line2.missingCount).toBe(3);
  });
  it('unlocks the line (lesson present) once every word is graduated', () => {
    const lines = buildCulminatingLines(intro, graduating('будто', 'полетев', 'фантомом'));
    const line2 = lines.find((l) => l.ordinal === introLine2.ordinal)!;
    expect(line2.unlocked).toBe(true);
    expect(line2.lesson).toBeTruthy();
  });
  it('the culminating card is the full line, cap-safe, with the real line as context', () => {
    const lines = buildCulminatingLines(intro, graduating('будто', 'полетев', 'фантомом'));
    const lesson = lines.find((l) => l.ordinal === introLine2.ordinal)!.lesson!;
    expect(lesson.steps.length).toBe(1);
    const card = lesson.steps[0];
    expect(card.surfaceForm).toBe('будто полетев фантомом'); // analyzed words joined (matches chips)
    expect(card.contextSentence?.ru).toBe(introLine2.text); // the real line shown after solving
    expect(card.contextSentence?.en).toBe(introLine2.translation);
    // 0 new concepts (all graduated) → cap-compliant.
    expect(() => assertLessonWithinCap(lesson, graduating('будто', 'полетев', 'фантомом'))).not.toThrow();
  });
});

describe('resolveCulminatingLineLesson', () => {
  it('resolves an unlocked line id to its lesson + the svetofor deck + section', () => {
    const id = culminatingLineLessonId('sv-intro', introLine2.ordinal);
    const resolved = resolveCulminatingLineLesson(id, graduating('будто', 'полетев', 'фантомом'));
    expect(resolved).toBeTruthy();
    expect(resolved!.lesson.id).toBe(id);
    expect(resolved!.deck.id).toBe('svetofor');
    expect(resolved!.subDeck.id).toBe('sv-intro');
  });
  it('returns null when the line is locked (not all words graduated)', () => {
    const id = culminatingLineLessonId('sv-intro', introLine2.ordinal);
    expect(resolveCulminatingLineLesson(id, {})).toBeNull();
  });
});

describe('isCulminatingLineLessonId', () => {
  it('true for culminating ids, false for arc ids and static ids', () => {
    expect(isCulminatingLineLessonId('sdyn-sv-intro-line-2')).toBe(true);
    expect(isCulminatingLineLessonId('sdyn-sv-intro-3-l1')).toBe(false); // an arc id
    expect(isCulminatingLineLessonId('f-1')).toBe(false);
    expect(isCulminatingLineLessonId(undefined)).toBe(false);
  });
});

describe('determinism', () => {
  it('same mastery yields identical culminating lessons', () => {
    const m = graduating('будто', 'полетев', 'фантомом');
    const a = buildCulminatingLines(intro, m).map((l) => ({ o: l.ordinal, u: l.unlocked, sf: l.lesson?.steps[0].surfaceForm }));
    const b = buildCulminatingLines(intro, m).map((l) => ({ o: l.ordinal, u: l.unlocked, sf: l.lesson?.steps[0].surfaceForm }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
