// utils/knowalong/contextProvider.ts
//
// The ContextProvider seam (ADR Phase 4.1). Given a lyric target word, return
// short multi-word phrases that WRAP it — so a novel target is taught inside a
// real phrase, never as an isolated single word. This is the consumer-side
// conduit for context mapping: today the mock derives phrases from the song's
// own lyric lines (+ morphology-safe particle pairing); a future Supabase impl
// will serve AI-mapped associative phrases (a Studio workstream writes target→
// context rows to SQLite, pushes to Supabase, fetched here) — the same mock→
// Supabase swap pattern as SpineProvider (Phase 6).
//
// Why lyric lines as the mock source: a lyric word's own line is REAL, correct,
// sustainable context — no hand-authoring, no morphology risk (it is an actual
// song slice). It stays valuable as a permanent fallback even after AI mapping.
//
// Why particle pairing: the first word of a fresh multi-unknown line (e.g. будто)
// has no known line-mates yet, so a lyric window would force a later line-mate to
// be taught as a bare single-word scaffold. A particle/conjunction + a gradient
// clause («будто я вижу») is morphology-safe (particles don't inflect) and gives
// that first word external context now — eliminating the single-word scaffold.
// Full per-word wrapping for verb/noun/adjective first-words remains the AI path.

import type { WordPart } from './fixtures/learningItems';
import { LEARNING_ITEMS } from './fixtures/learningItems';
import { SVETOFOR_SONG } from './fixtures/svetoforSong';
import { wordKey } from './mastery';

/** A short phrase wrapping a target (the target is among `words`). */
export interface ContextPhrase {
  surfaceForm: string;
  meaning: string;
  words: WordPart[];
}

/** Maps a lyric target to short context phrases that wrap it. The generator
 *  scaffolds any unknown non-target words, then reveals the target in the phrase.
 *  Empty array ⇒ no context available (generator falls back to foundational
 *  gradient scaffolding). */
export interface ContextProvider {
  contextPhrasesFor(target: WordPart): readonly ContextPhrase[];
}

/** Max context phrases returned per target — enough windows + a particle clause
 *  for the generator to find a READY one (no scaffolding) without bloat. */
const MAX_PHRASES_PER_TARGET = 6;

/** Short gradient clauses reused as morphology-safe external context for
 *  particle/conjunction targets (a particle + a clause is grammatical). Bridges
 *  the "first word of a fresh line" gap until AI associative mapping arrives. */
const GRADIENT_CLAUSES: readonly WordPart[][] = ['я вижу', 'я знаю', 'я хочу']
  .map((sf) => LEARNING_ITEMS.find((i) => i.surfaceForm === sf))
  .filter((i): i is NonNullable<(typeof LEARNING_ITEMS)[number]> => !!i)
  .map((i) => i.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })));

type LyricLine = (typeof SVETOFOR_SONG)['sections'][number]['lines'][number];

/** All multi-word windows of a lyric line that include the word at `targetIdx`
 *  — a 2-word left/right pair and the 3-word centered span. Returning several
 *  sizes lets the generator pick a READY one (whose non-target words are already
 *  known) and avoid scaffolding a line-mate as a bare single-word "victim". Each
 *  window is a real lyric slice (morphologically correct by construction) and
 *  ≤3 words (the full line is Phase 5's culminating lesson).
 *
 *  The window's `meaning` is composed from its OWN word glosses — NOT the full
 *  line translation. A 2-word window like «будто полетев» is "as if having
 *  flown", not the whole line ("Ah, as if flying like a phantom, ah"), so the
 *  build prompt matches the chips actually on screen. */
function lineWindows(line: LyricLine, targetIdx: number): ContextPhrase[] {
  const words = line.words;
  const make = (start: number, end: number): ContextPhrase => {
    const slice = words.slice(start, end).map((w) => ({ form: w.form, gloss: w.gloss, role: w.role }));
    return {
      surfaceForm: slice.map((w) => w.form).join(' '),
      meaning: slice.map((w) => w.gloss).join(' '),
      words: slice,
    };
  };
  const out: ContextPhrase[] = [];
  if (targetIdx > 0) out.push(make(targetIdx - 1, targetIdx + 1)); // [prev, target]
  if (targetIdx < words.length - 1) out.push(make(targetIdx, targetIdx + 2)); // [target, next]
  if (targetIdx > 0 && targetIdx < words.length - 1) out.push(make(targetIdx - 1, targetIdx + 2)); // [prev, target, next]
  return out.filter((p) => p.words.length >= 2);
}

/** Morphology-safe external context for a particle/conjunction target: the target
 *  followed by a short gradient clause. */
function particleClauses(target: WordPart): ContextPhrase[] {
  return GRADIENT_CLAUSES.map((clause) => {
    const words: WordPart[] = [{ form: target.form, gloss: target.gloss, role: target.role }, ...clause];
    return {
      surfaceForm: words.map((w) => w.form).join(' '),
      meaning: [target.gloss, ...clause.map((w) => w.gloss)].join(' '),
      words,
    };
  });
}

/** Mock ContextProvider: lyric-line windows (real song context) + morphology-safe
 *  particle/conjunction external pairing. Pure + deterministic. */
function mockContextPhrasesFor(target: WordPart): readonly ContextPhrase[] {
  const tKey = wordKey(target.form);
  const out: ContextPhrase[] = [];
  const seen = new Set<string>();
  const add = (p: ContextPhrase) => {
    if (p.words.length < 2) return; // a 1-word "phrase" can't wrap the target
    if (seen.has(p.surfaceForm)) return;
    seen.add(p.surfaceForm);
    out.push(p);
  };
  // Real song context first (most faithful — the target in its actual line).
  for (const section of SVETOFOR_SONG.sections) {
    for (const line of section.lines) {
      const idx = line.words.findIndex((w) => wordKey(w.form) === tKey);
      if (idx >= 0) for (const w of lineWindows(line, idx)) add(w);
    }
  }
  // External context for particles/conjunctions (avoids single-word scaffolds
  // for the first word of a fresh line).
  if (target.role === 'particle') {
    for (const p of particleClauses(target)) add(p);
  }
  return out.slice(0, MAX_PHRASES_PER_TARGET);
}

/** Build a mock ContextProvider (lyric-window + particle pairing). The v1 (and
 *  only) implementation; a Supabase impl lands in Phase 6 with this as fallback. */
export function createMockContext(): ContextProvider {
  return { contextPhrasesFor: mockContextPhrasesFor };
}

let DEFAULT_CONTEXT: ContextProvider | null = null;

/** The app-wide default ContextProvider. Mock today; Phase 6 resolves this from
 *  the learner-Supabase read path (AI-mapped associative phrases), keeping the
 *  mock as fallback. */
export function getContext(): ContextProvider {
  if (DEFAULT_CONTEXT) return DEFAULT_CONTEXT;
  DEFAULT_CONTEXT = createMockContext();
  return DEFAULT_CONTEXT;
}
