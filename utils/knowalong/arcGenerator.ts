// utils/knowalong/arcGenerator.ts
//
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md). buildArcForTarget
// produces the lessons needed to graduate ONE target concept (a lyric word), sized to
// the learner's current mastery (R4) and capped on new-concept load (R1/R2/R3,
// enforced via the Phase 1 concept module).
//
// Resolution order:
//   A — the target is contextualizable NOW: some MULTI-WORD corpus/lyric phrase
//       contains it and has exactly one unknown — the target itself. That phrase
//       IS the i+1 card → a minimal one-lesson arc.
//   B — context wrapping (Phase 4.1): reveal the target inside one of its context
//       phrases (from the ContextProvider seam), scaffolding any unknown SPINE
//       words first. The target is taught inside a real multi-word phrase, never
//       as an isolated single word.
//   —  defer: if no Mode-A host and no teachable, wrappable context phrase, emit
//       NOTHING for this target. The word is acquired via exposure in the
//       culminating line (Phase 5) rather than as a single-word or nonsense card.
//
// Phase 4.1+ invariants (the durable, source-agnostic rules):
//  - NO single-card single-word lesson is ever emitted (the reported bug class).
//  - Teachability filter: a context phrase is only used if it has ≥1 content word
//    (verb/noun/adjective/adverb). A pure function-word phrase (particles/pronouns,
//    e.g. «будто бы») has no semantic anchor → a nonsense build prompt → filtered.
//    This applies to mock AND future AI phrases equally (a construction invariant,
//    like the concept cap).
//  - Un-teachable targets DEFER rather than becoming single-word cards.
//  - Scaffolding only teaches SPINE atoms (gradient/CLCC), never a novel lyric
//    line-mate (which would itself become a single-word "victim").
//
// The earlier compositional-arc fallback (Phase 3.1) is retired: it terminated in a
// single-word target card, which this design forbids. Gradient introduction now
// happens via context-wrapping (a particle target's clause scaffolds the gradient).
//
// Pure + deterministic (stable corpus order; no Math.random). The hard cap is a
// correctness gate, asserted on every emitted lesson.

import type { Lesson, LessonStep } from './fixtures/decks';
import type { WordPart, WordRole } from './fixtures/learningItems';
import { WORD_FADE_THRESHOLD, classifyWord, phraseReadiness, wordKey, type MasteryMap, type WordMastery } from './mastery';
import { assertLessonWithinCap, MAX_NEW_CONCEPTS_PER_CARD, MAX_NEW_CONCEPTS_PER_LESSON, newConceptKeys } from './concept';
import type { SpineProvider } from './spine';
import type { ContextPhrase, ContextProvider } from './contextProvider';

/** A target concept the arc graduates. Structurally a word part (form/gloss/role). */
export type ArcTarget = WordPart;

export interface BuildArcOptions {
  /** Namespace for deterministic lesson/step ids (e.g. 'sv-verse1'). */
  idPrefix: string;
  title?: string;
  subtitle?: string;
  icon?: Lesson['icon'];
}

/** A graduated mastery record — overlaid on taught concepts so the Phase 1 cap
 *  counts a concept taught in lesson N as known by lesson N+1. Matches the
 *  mastery module's graduated classification (streak ≥ threshold). */
const GRADUATED_RECORD: WordMastery = {
  exposures: 1,
  correct: WORD_FADE_THRESHOLD,
  streak: WORD_FADE_THRESHOLD,
  mistakes: 0,
  lastSeenMs: 1,
};

/** A single-concept card: one surface form, one word. Used only to scaffold a
 *  SPINE atom (gradient/CLCC) that a context phrase needs — never as a target's
 *  own card (targets are always revealed inside a multi-word phrase or deferred). */
function singleWordStep(concept: WordPart, itemId: string): LessonStep {
  return {
    itemId,
    surfaceForm: concept.form,
    meaning: concept.gloss,
    words: [{ form: concept.form, gloss: concept.gloss, role: concept.role }],
  };
}

/** Clone a spine step under a fresh itemId so a generated card carries a unique,
 *  namespaced id. All teaching payload is carried through unchanged. */
function rebasedStep(step: LessonStep, itemId: string): LessonStep {
  return { ...step, itemId };
}

/** Is `form` graduated in `mastery`? (ADR: known = classifyWord === 'graduated'.) */
function isGraduated(form: string, mastery: MasteryMap): boolean {
  return classifyWord(mastery[wordKey(form)]) === 'graduated';
}

/** Content roles carry semantic substance; function roles (pronoun/particle) don't. */
const CONTENT_ROLES: ReadonlySet<WordRole> = new Set(['verb', 'noun', 'adjective', 'adverb']);

/** The teachability filter (Phase 4.1+). A phrase is usable as a build card only
 *  if it has ≥1 content word — a pure function-word phrase (e.g. «будто бы»,
 *  particle + particle) has no semantic anchor and yields a nonsense build prompt.
 *  Source-agnostic: applies to mock and AI phrases alike. */
function hasContentWord(p: { words: ReadonlyArray<{ role: WordRole }> }): boolean {
  return p.words.some((w) => CONTENT_ROLES.has(w.role));
}

// ── Mode A: contextualize via an existing multi-word corpus phrase ───────

/** The best multi-word spine phrase that contextualizes `target` right now: it
 *  contains the target, the target is not yet graduated, and the target is the
 *  phrase's ONLY unknown (unknownCount === 1). Returns null if none. Shortest
 *  ready phrase wins. */
function bestReadyHost(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider): LessonStep | null {
  if (isGraduated(target.form, mastery)) return null; // already known — nothing to contextualize
  const tKey = wordKey(target.form);
  const candidates = [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.lyricSteps()].filter(
    (s) => s.words.length >= 2 && s.words.some((w) => wordKey(w.form) === tKey),
  );
  const ready = candidates
    .map((step) => ({ step, unknownCount: phraseReadiness(step, mastery).unknownCount }))
    .filter((c) => c.unknownCount === 1)
    .sort((a, b) => a.step.words.length - b.step.words.length);
  return ready.length > 0 ? ready[0].step : null;
}

// ── Lesson chunking (cap-compliant) ─────────────────────────────────────

/** Chunk an ordered card list into cap-compliant lessons. assertLessonWithinCap
 *  measures R1 (per card) and R2 (per lesson) against a FROZEN per-lesson mastery
 *  snapshot — a concept taught earlier in the SAME lesson is not yet known for the
 *  cards after it. So a card joins the current lesson only if it is R1-safe
 *  (≤1 new word vs the lesson's start mastery) and the lesson's new-concept union
 *  stays ≤3 (R2); otherwise it opens the next lesson. Every lesson is hard-gated
 *  via assertLessonWithinCap. */
function chunkCardsIntoLessons(cards: LessonStep[], inputMastery: MasteryMap, opts: BuildArcOptions): Lesson[] {
  const icon = opts.icon ?? 'sparkles';
  const title = opts.title ?? opts.idPrefix;
  const taught: MasteryMap = { ...inputMastery }; // grows as lessons complete

  const lessons: Lesson[] = [];
  let currentSteps: LessonStep[] = [];
  let currentStart: MasteryMap = { ...inputMastery }; // frozen at lesson open
  let currentUnion = new Set<string>();

  const flush = () => {
    if (currentSteps.length === 0) return;
    const lessonIndex = lessons.length + 1;
    const lesson: Lesson = {
      id: `${opts.idPrefix}-l${lessonIndex}`,
      title: lessonIndex === 1 ? title : `${title} · ${lessonIndex}`,
      subtitle: opts.subtitle ?? `${currentSteps.length} phrase${currentSteps.length === 1 ? '' : 's'}`,
      icon,
      steps: currentSteps,
      stepCount: currentSteps.length,
    };
    assertLessonWithinCap(lesson, currentStart); // hard gate (R1/R2)
    lessons.push(lesson);
    for (const k of currentUnion) taught[k] = GRADUATED_RECORD; // now known for later lessons
    currentSteps = [];
    currentStart = { ...taught };
    currentUnion = new Set();
  };

  for (const card of cards) {
    const cardNew = new Set(newConceptKeys([card], currentStart));
    const r1Ok = cardNew.size <= MAX_NEW_CONCEPTS_PER_CARD;
    const projectedUnion = new Set([...currentUnion, ...cardNew]);
    const r2Ok = projectedUnion.size <= MAX_NEW_CONCEPTS_PER_LESSON;
    if (currentSteps.length > 0 && r1Ok && r2Ok) {
      currentSteps.push(card);
      currentUnion = projectedUnion;
    } else {
      // Open a new lesson for this card (R1-safe against the updated `taught`).
      flush();
      currentSteps = [card];
      currentStart = { ...taught };
      currentUnion = new Set(newConceptKeys([card], currentStart));
    }
  }
  flush();
  return lessons;
}

// ── Mode B: context wrapping — never a single-word lesson ──────────────

/** Max ready context phrases a target is revealed in (encoding variability). */
const MAX_READY_CONTEXT_PHRASES = 2;

/** A ContextPhrase → LessonStep (the chip builder consumes steps). */
function contextPhraseToStep(p: ContextPhrase, itemId: string): LessonStep {
  return {
    itemId,
    surfaceForm: p.surfaceForm,
    meaning: p.meaning,
    words: p.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
  };
}

/** Mode B body. Wrap `target` in a teachable context phrase so it is taught inside
 *  a real multi-word phrase, never as an isolated single word.
 *
 *  A phrase is usable when it (a) passes the teachability filter (≥1 content word)
 *  and (b) is wrappable — its unknown NON-target words are all SPINE atoms
 *  (gradient/CLCC), which are legitimate to scaffold. It never scaffolds a NOVEL
 *  lyric line-mate (that would be a single-word "victim"). Among usable phrases it
 *  prefers READY ones (zero unknowns), then the fewest scaffolds.
 *
 *  Returns null when no phrase is teachable+wrappable, so the caller DEFERS the
 *  target (emits nothing; it is acquired via the culminating line in Phase 5). */
function buildContextWrappingArc(target: ArcTarget, phrases: readonly ContextPhrase[], mastery: MasteryMap, spine: SpineProvider, opts: BuildArcOptions): Lesson[] | null {
  const tKey = wordKey(target.form);
  const teachable = phrases.filter(hasContentWord);
  if (teachable.length === 0) return null; // no semantic anchor → defer

  const spineWords = new Set<string>();
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) for (const w of step.words) spineWords.add(wordKey(w.form));

  const evolved: MasteryMap = { ...mastery };
  const unknownNonTarget = (p: ContextPhrase): WordPart[] =>
    p.words.filter((w) => wordKey(w.form) !== tKey && !isGraduated(w.form, evolved));
  // Wrappable: every unknown non-target word is a scaffoldable spine atom.
  const wrappable = teachable.filter((p) => unknownNonTarget(p).every((w) => spineWords.has(wordKey(w.form))));
  if (wrappable.length === 0) return null; // context exists but needs novel line-mates → defer

  const ready = wrappable.filter((p) => unknownNonTarget(p).length === 0);
  const cards: LessonStep[] = [];
  const use = (ready.length > 0 ? ready : [...wrappable].sort((a, b) => unknownNonTarget(a).length - unknownNonTarget(b).length)).slice(0, MAX_READY_CONTEXT_PHRASES);

  // Scaffold the chosen phrases' unknown spine words (deduped) — always-funded.
  // Each scaffold card gets a UNIQUE id (per word): the lesson player keys
  // LessonRound by step.itemId, so duplicate ids would leak placement state
  // across consecutive cards (a card mounting pre-filled / unsolvable).
  const scaffolded = new Set<string>();
  for (const p of use) {
    for (const w of unknownNonTarget(p)) {
      const k = wordKey(w.form);
      if (scaffolded.has(k)) continue;
      scaffolded.add(k);
      cards.push(singleWordStep(w, `${opts.idPrefix}-ctx-${k}`));
      evolved[k] = GRADUATED_RECORD;
    }
  }
  let phraseIdx = 0;
  for (const p of use) cards.push(contextPhraseToStep(p, `${opts.idPrefix}-p${(phraseIdx += 1)}`));

  const lessons = chunkCardsIntoLessons(cards, mastery, opts);
  // Hard rule (Phase 4.1+): never emit a single-card single-word lesson. A lone
  // scaffold atom (e.g. when a phrase needs exactly one unknown spine word) would
  // land alone — defer the target rather than ship it; the word is acquired via
  // the culminating line (Phase 5) or already-known from the Foundations deck.
  if (lessons.some((l) => l.steps.length === 1 && l.steps[0].words.length === 1)) return null;
  return lessons;
}

// ── Public API ──────────────────────────────────────────────────────────

/** Build the mastery-sized arc that graduates `target`, or [] to DEFER it.
 *  Resolution: Mode A (a ready contextualizing phrase) → Mode B context wrapping
 *  (target inside a teachable context phrase) → defer (no card; acquired via the
 *  culminating line in Phase 5). Never emits a single-card single-word lesson.
 *  Pure, deterministic; every lesson is hard-gated on the concept cap. */
export function buildArcForTarget(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider, opts: BuildArcOptions): Lesson[] {
  if (isGraduated(target.form, mastery)) return []; // already graduated

  // Mode A: a multi-word corpus/lyric phrase already contextualizes the target —
  // the phrase's only unknown is the target.
  const host = bestReadyHost(target, mastery, spine);
  if (host) {
    const lesson: Lesson = {
      id: `${opts.idPrefix}-l1`,
      title: opts.title ?? opts.idPrefix,
      subtitle: opts.subtitle ?? host.meaning,
      icon: opts.icon ?? 'sparkles',
      steps: [rebasedStep(host, `${opts.idPrefix}-target`)],
      stepCount: 1,
    };
    assertLessonWithinCap(lesson, mastery); // hard gate
    return [lesson];
  }

  // Mode B: wrap the target in a teachable context phrase (scaffolding any unknown
  // spine words first). Returns null when no phrase is teachable+wrappable.
  const phrases = context.contextPhrasesFor(target);
  if (phrases.length > 0) {
    const wrapped = buildContextWrappingArc(target, phrases, mastery, spine, opts);
    if (wrapped && wrapped.length > 0) return wrapped;
  }

  // Defer: no ready host and no teachable wrappable context. The target is not
  // taught as a card — it is acquired via exposure in the culminating line (Phase
  // 5). This is the durable alternative to a single-word or nonsense card.
  return [];
}
