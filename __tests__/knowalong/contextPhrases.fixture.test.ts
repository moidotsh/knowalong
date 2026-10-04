// __tests__/knowalong/contextPhrases.fixture.test.ts
//
// The R7 data-completeness + integrity gate for the authored mock context
// phrases. This is the test that catches a missing/short authored set BEFORE
// runtime (buildSongSectionLessons would otherwise throw R7 at render). It also
// enforces the authoring rules: surfaceForm derives from words (can't diverge),
// the target is present, and every NON-target word is a palette atom (so the
// generator's wrappability filter never silently drops a phrase).

import { describe, it, expect } from 'vitest';
import { AUTHORED_CONTEXT_PHRASES } from '../../utils/knowalong/fixtures/contextPhrases';
import { PALETTE } from '../../utils/knowalong/fixtures/palette';
import { SVETOFOR_SONG } from '../../utils/knowalong/fixtures/svetoforSong';
import { buildArcForTarget, MIN_ENCODING_VARIABILITY_CARDS } from '../../utils/knowalong/arcGenerator';
import { getSpine } from '../../utils/knowalong/spine';
import { getContext } from '../../utils/knowalong/contextProvider';
import { WORD_FADE_THRESHOLD, wordKey, type MasteryMap, type WordMastery } from '../../utils/knowalong/mastery';
import type { WordPart } from '../../utils/knowalong/fixtures/learningItems';

const GRAD: WordMastery = { exposures: 1, correct: WORD_FADE_THRESHOLD, streak: WORD_FADE_THRESHOLD, mistakes: 0, lastSeenMs: 1 };

/** Every word the mock knows, keyed — palette + gradient + CLCC + every song word. */
const ALL_WORDS: Set<string> = new Set<string>();
for (const w of PALETTE) ALL_WORDS.add(wordKey(w.form));
for (const step of [...getSpine().foundationalSteps(), ...getSpine().conceptSteps(), ...getSpine().lyricSteps()]) {
  for (const w of step.words) ALL_WORDS.add(wordKey(w.form));
}

/** Mastery graduating EVERY known word except `target` — the maximal-context
 *  case (palette + all song line-mates known), so every authored phrase passes
 *  wrappability and the count reflects the full authored set + ready lyric
 *  windows. If a target can't reach ≥8 even here, it can't in the mock. */
function masteryExcept(target: string): MasteryMap {
  const tKey = wordKey(target);
  const m: MasteryMap = {};
  for (const k of ALL_WORDS) if (k !== tKey) m[k] = GRAD;
  return m;
}

/** Find a target's WordPart (form/gloss/role) in the song. */
function songWord(form: string): WordPart {
  for (const section of SVETOFOR_SONG.sections) {
    for (const line of section.lines) {
      const w = line.words.find((lw) => wordKey(lw.form) === wordKey(form));
      if (w) return { form: w.form, gloss: w.gloss, role: w.role };
    }
  }
  return { form, gloss: '', role: 'particle' };
}

describe('AUTHORED_CONTEXT_PHRASES — integrity', () => {
  for (const [targetKey, phrases] of AUTHORED_CONTEXT_PHRASES) {
    describe(`target "${targetKey}"`, () => {
      it('every phrase exposes the target, derives surface from words, and uses only palette atoms', () => {
        for (const phrase of phrases) {
          // surfaceForm derived from words.
          expect(phrase.surfaceForm).toBe(phrase.words.map((w) => w.form).join(' '));
          // target is among the words.
          expect(phrase.words.some((w) => wordKey(w.form) === wordKey(targetKey))).toBe(true);
          // every NON-target word is a palette/known atom (wrappable when graduated).
          for (const w of phrase.words) {
            if (wordKey(w.form) === wordKey(targetKey)) continue;
            expect(ALL_WORDS.has(wordKey(w.form))).toBe(true);
          }
        }
      });
    });
  }
});

describe('AUTHORED_CONTEXT_PHRASES — R7 completeness (≥8 via the generator)', () => {
  for (const targetKey of AUTHORED_CONTEXT_PHRASES.keys()) {
    it(`target "${targetKey}" yields ≥${MIN_ENCODING_VARIABILITY_CARDS} context cards and does not throw`, () => {
      const target = songWord(targetKey);
      const lessons = buildArcForTarget(target, masteryExcept(targetKey), getSpine(), getContext(), {
        idPrefix: `test-${targetKey}`,
        title: targetKey,
        subtitle: target.gloss,
      });
      expect(lessons.length).toBeGreaterThan(0);
      const reveals = lessons.reduce((n, l) => n + l.steps.filter((s) => s.words.some((w) => wordKey(w.form) === wordKey(targetKey))).length, 0);
      expect(reveals).toBeGreaterThanOrEqual(MIN_ENCODING_VARIABILITY_CARDS);
    });
  }
});
