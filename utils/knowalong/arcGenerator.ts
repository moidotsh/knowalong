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

import type { Lesson, LessonStep, StepMode } from './fixtures/decks';
import type { WordPart, WordRole } from './fixtures/learningItems';
import { WORD_FADE_THRESHOLD, classifyWord, phraseReadiness, wordKey, type MasteryMap, type WordMastery } from './mastery';
import { assertLessonWithinCap, MAX_NEW_CONCEPTS_PER_CARD, MAX_NEW_CONCEPTS_PER_LESSON, newConceptKeys } from './concept';
import { AppError, ErrorCode } from '../errors';
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

/** Clone a spine step under a fresh itemId so a generated card carries a unique,
 *  namespaced id. All teaching payload is carried through unchanged. */
function rebasedStep(step: LessonStep, itemId: string): LessonStep {
  return { ...step, itemId };
}

/** Is `form` graduated in `mastery`? (ADR: known = classifyWord === 'graduated'.) */
function isGraduated(form: string, mastery: MasteryMap): boolean {
  return classifyWord(mastery[wordKey(form)]) === 'graduated';
}

/** Content roles carry semantic substance; function roles (particle) don't. A
 *  pronoun carries enough semantic anchor for an interjection/conjunction target
 *  (e.g. «эй, ты», «как ты») — only a pure particle phrase («будто бы») is anchorless. */
const CONTENT_ROLES: ReadonlySet<WordRole> = new Set(['verb', 'noun', 'adjective', 'adverb']);

/** The teachability filter (Phase 4.1+; relaxed R7). A phrase is usable as a build
 *  card if it has ≥1 content word OR ≥1 pronoun — both give a semantic anchor. Only
 *  a pure particle phrase (e.g. «будто бы», particle + particle) is rejected as
 *  nonsense. Source-agnostic: applies to mock and AI phrases alike. */
function hasSemanticAnchor(p: { words: ReadonlyArray<{ role: WordRole }> }): boolean {
  return p.words.some((w) => CONTENT_ROLES.has(w.role) || w.role === 'pronoun');
}

// ── Mode A: contextualize via an existing multi-word corpus phrase ───────

/** The best multi-word spine phrase that contextualizes `target` right now: it
 *  contains the target, the target is not yet graduated, and the target is the
 *  phrase's ONLY unknown (unknownCount === 1). Returns null if none. Shortest
 *  ready phrase wins. */
function bestReadyHost(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider): LessonStep | null {
  if (isGraduated(target.form, mastery)) return null; // already known — nothing to contextualize
  const tKey = wordKey(target.form);
  const candidates = [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.lyricSteps(), ...spine.paletteSteps()].filter(
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

// ── Encoding variability (R7) ───────────────────────────────────────────

/** R7 floor: the minimum distinct context phrases a target is revealed in. The
 *  target is the sole NEW concept on each reveal card (palette/spine context is
 *  graduated or scaffolded first), so all reveal cards land in ONE cap-compliant
 *  lesson — encoding variability, the i+1 way to teach a word thoroughly rather
 *  than as a 1–3 card stub. Culminating synthesis lessons (Phase 5) are exempt:
 *  they never pass through buildArcForTarget. */
const MIN_ENCODING_VARIABILITY_CARDS = 8;

/** A ContextPhrase → LessonStep (the chip builder consumes steps). */
function contextPhraseToStep(p: ContextPhrase, itemId: string): LessonStep {
  return {
    itemId,
    surfaceForm: p.surfaceForm,
    meaning: p.meaning,
    words: p.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
  };
}

/** Does this step reveal the target (is the target among its words)? */
function revealsTarget(step: LessonStep, tKey: string): boolean {
  return step.words.some((w) => wordKey(w.form) === tKey);
}

/** R7 hard gate (authored-served targets). Counts the target-reveal cards across
 *  the arc; throws if < MIN_ENCODING_VARIABILITY_CARDS. A short target is a DATA
 *  GAP — missing authored context phrases for `target.form` — surfaced loudly
 *  (the fixture-completeness test + buildSongSectionLessons fail, pointing at the
 *  exact target) rather than silently deferred. Parallel to assertLessonWithinCap
 *  (a cap gate); this is a data-completeness gate. */
function assertArcEncodingVariety(lessons: readonly Lesson[], target: ArcTarget, idPrefix: string): void {
  const tKey = wordKey(target.form);
  const reveals = lessons.reduce((n, l) => n + l.steps.filter((s) => revealsTarget(s, tKey)).length, 0);
  if (reveals >= MIN_ENCODING_VARIABILITY_CARDS) return;
  throw new AppError(
    `Arc "${idPrefix}" violates R7: target "${target.form}" has ${reveals} context card(s) (needs ≥${MIN_ENCODING_VARIABILITY_CARDS}). Add authored context phrases for "${target.form}" in fixtures/contextPhrases.ts.`,
    ErrorCode.VALIDATION_ERROR,
    { details: { idPrefix, target: target.form, reveals, cap: MIN_ENCODING_VARIABILITY_CARDS } },
  );
}

// ── R8: interaction-mode variety ────────────────────────────────────────

/** The three interaction modes an encoding-variability card can use (ADR R8).
 *  build = assemble EN→RU chips; reverse = decode RU→EN chips; cloze = tap the
 *  word that fills a Russian gap. Round-robin assignment guarantees the learner
 *  meets the target via all three rather than 8× the same "target ___" build. */
const VARIETY_MODES: readonly StepMode[] = ['build', 'reverse', 'cloze'];
/** R8 floor: minimum distinct interaction modes across an arc's cards. */
const MIN_DISTINCT_MODES = 2;

/** Round-robin assign interaction modes to the reveal cards for variety (R8):
 *  consecutive cards never share a mode, and the three modes distribute evenly.
 *  Cloze cards blank the TARGET (the concept under study), revealing it in a
 *  fill-the-blank frame; their `clozePrompt` is the phrase with the target → ___,
 *  `clozeAnswer` the target form, `clozeMeaning` the English. Pure. */
function applyVarietyModes(cards: readonly LessonStep[], target: ArcTarget): LessonStep[] {
  const tKey = wordKey(target.form);
  return cards.map((card, i) => {
    const mode = VARIETY_MODES[i % VARIETY_MODES.length];
    if (mode !== 'cloze') return { ...card, mode };
    const tIdx = card.words.findIndex((w) => wordKey(w.form) === tKey);
    if (tIdx < 0) return { ...card, mode: 'build' }; // target absent (shouldn't happen) → safe fallback
    const clozePrompt = card.words.map((w, j) => (j === tIdx ? '___' : w.form)).join(' ');
    return { ...card, mode, clozePrompt, clozeAnswer: card.words[tIdx].form, clozeMeaning: card.meaning };
  });
}

/** R8 hard gate: an arc's cards span ≥ MIN_DISTINCT_MODES interaction modes. A
 *  single-mode arc is monotonous (the "8× как ___" failure) — a variety gap the
 *  round-robin assigner prevents; this asserts it never regresses. */
function assertArcVariety(lessons: readonly Lesson[], idPrefix: string): void {
  const modes = new Set<string>();
  for (const l of lessons) for (const s of l.steps) modes.add(s.mode ?? 'build');
  if (modes.size >= MIN_DISTINCT_MODES) return;
  throw new AppError(
    `Arc "${idPrefix}" violates R8: only ${modes.size} interaction mode(s) — cards are monotonous (need ≥${MIN_DISTINCT_MODES}).`,
    ErrorCode.VALIDATION_ERROR,
    { details: { idPrefix, modes: [...modes], cap: MIN_DISTINCT_MODES } },
  );
}

/** The spine (foundational gradient + CLCC + palette) as a PRESUMED known-context
 *  baseline, overlaid on the learner's mastery. Song arcs teach only the target;
 *  the spine is the known sea it swims in (taught by the Foundations / CLCC / Core
 *  Vocab decks). This removes inline scaffolding — which split cold-start arcs
 *  into many small ≤3-card lessons — so each target yields ONE clean ≥8-card
 *  encoding-variability lesson. Pure. */
function withSpineBaseline(mastery: MasteryMap, spine: SpineProvider): MasteryMap {
  const m: MasteryMap = { ...mastery };
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps(), ...spine.paletteSteps()]) {
    for (const w of step.words) m[wordKey(w.form)] = GRADUATED_RECORD;
  }
  return m;
}

/** A phrase is usable when it has a semantic anchor AND every NON-target word is
 *  graduated in the baseline (the presumed-known spine) — so the target is the
 *  sole new concept and the phrase is i+1. Extracted so the position-variety
 *  check can inspect the same candidate pool the builder uses. */
function usablePhrases(phrases: readonly ContextPhrase[], tKey: string, baseline: MasteryMap): readonly ContextPhrase[] {
  return phrases.filter(hasSemanticAnchor).filter((p) =>
    p.words.every((w) => wordKey(w.form) === tKey || isGraduated(w.form, baseline)));
}

// ── R9: target-position variety ─────────────────────────────────────────

/** Where the target sits in a phrase/card: lead (index 0), tail (last), or mid.
 *  Used to interleave cards so the target isn't always at the same spot. */
type TargetPosition = 'start' | 'mid' | 'end';
function targetPositionOf(step: { words: ReadonlyArray<{ form: string }> }, tKey: string): TargetPosition {
  const idx = step.words.findIndex((w) => wordKey(w.form) === tKey);
  if (idx < 0) return 'start';
  const last = step.words.length - 1;
  if (idx <= 0) return 'start';
  if (idx >= last) return 'end';
  return 'mid';
}

/** Reorder cards so consecutive ones differ in target position wherever
 *  possible (R9): greedily pick the bucket with the most remaining cards that
 *  isn't the previous card's position — this SPREADS the minority positions
 *  through the lesson instead of clustering them (a plain round-robin would
 *  exhaust mid/end early and leave a run of the majority at the end). No-op
 *  when all cards share one position (variety isn't in the data). */
function interleaveByPosition(cards: readonly LessonStep[], tKey: string): LessonStep[] {
  const buckets: Record<TargetPosition, LessonStep[]> = { start: [], mid: [], end: [] };
  for (const c of cards) buckets[targetPositionOf(c, tKey)].push(c);
  const distinct = (['start', 'mid', 'end'] as const).filter((k) => buckets[k].length > 0);
  if (distinct.length <= 1) return [...cards]; // nothing to interleave
  const out: LessonStep[] = [];
  let prev: TargetPosition | null = null;
  while (out.length < cards.length) {
    // Prefer the largest bucket that isn't `prev` (when another has cards).
    const otherHas = distinct.some((k) => k !== prev && buckets[k].length > 0);
    let best: TargetPosition | null = null;
    for (const k of distinct) {
      if (otherHas && k === prev) continue;
      if (best === null || buckets[k].length > buckets[best].length) best = k;
    }
    out.push(buckets[best as TargetPosition].shift()!);
    prev = best;
  }
  return out;
}

/** R9 hard gate: the lesson spans ≥ min(MIN, pool) distinct target positions. If
 *  the candidate pool offered ≥2 positions, the lesson must use ≥2 (the
 *  interleave guarantees it). When the pool offers only one (a target that
 *  grammatically leads, e.g. an adverbial participle), the requirement is 1 —
 *  always satisfiable, never a false failure. */
const MIN_POSITION_VARIETY = 2;
function assertArcPositionVariety(lessons: readonly Lesson[], poolPositions: number, tKey: string, target: ArcTarget, idPrefix: string): void {
  const lessonPositions = new Set<TargetPosition>();
  for (const l of lessons) for (const s of l.steps) if (revealsTarget(s, tKey)) lessonPositions.add(targetPositionOf(s, tKey));
  const required = Math.min(MIN_POSITION_VARIETY, poolPositions);
  if (lessonPositions.size >= required) return;
  throw new AppError(
    `Arc "${idPrefix}" violates R9: target "${target.form}" appears at only ${lessonPositions.size} position(s) (pool offered ${poolPositions}; need ≥${required}). Add context phrases placing the target at a different position.`,
    ErrorCode.VALIDATION_ERROR,
    { details: { idPrefix, target: target.form, lessonPositions: [...lessonPositions], poolPositions, required } },
  );
}

/** Build the encoding-variability card list for `target`: an optional ready host
 *  (Mode A) first, then the target revealed in EVERY usable context phrase. NO
 *  scaffolding (the spine is the presumed-known baseline); a novel non-spine word
 *  makes a phrase not-ready and it is excluded. Because every usable phrase has
 *  the target as its sole new concept, all reveal cards land in ONE cap-compliant
 *  lesson. Cards are interleaved by target position (R9) then assigned varied
 *  interaction modes (R8). Dedupes by surfaceForm. Returns null when nothing is
 *  usable and there is no host (caller defers). */
function buildEncodingVariabilityCards(target: ArcTarget, host: LessonStep | null, phrases: readonly ContextPhrase[], baseline: MasteryMap, opts: BuildArcOptions): LessonStep[] | null {
  const tKey = wordKey(target.form);
  const usable = usablePhrases(phrases, tKey, baseline);
  if (usable.length === 0 && !host) return null; // no usable context and no host → defer
  const cards: LessonStep[] = [];
  const seenSurface = new Set<string>();
  const push = (step: LessonStep) => {
    if (seenSurface.has(step.surfaceForm)) return;
    seenSurface.add(step.surfaceForm);
    cards.push(step);
  };
  if (host) push(rebasedStep(host, `${opts.idPrefix}-host`));
  let phraseIdx = 0;
  for (const p of usable) push(contextPhraseToStep(p, `${opts.idPrefix}-p${(phraseIdx += 1)}`));
  if (cards.length === 0) return null;
  return applyVarietyModes(interleaveByPosition(cards, tKey), target);
}

// ── Public API ──────────────────────────────────────────────────────────

/** Build the mastery-sized arc that graduates `target`, or [] to DEFER it.
 *  Resolution: gather a ready host (Mode A — a corpus phrase whose only unknown is
 *  the target) + EVERY teachable+wrappable context phrase (lyric windows +
 *  authored), then reveal the target across all of them — encoding variability
 *  (R7: ≥8 context cards for authored-served targets). Never emits a single-card
 *  single-word TARGET lesson. Pure, deterministic; every lesson is hard-gated on
 *  the concept cap, and authored-served targets are hard-gated on R7. */
export function buildArcForTarget(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider, opts: BuildArcOptions): Lesson[] {
  if (isGraduated(target.form, mastery)) return []; // already graduated (real learner mastery)
  const tKey = wordKey(target.form);

  // The spine is the presumed-known context baseline (Foundations / CLCC / Core
  // Vocab). Song targets are the only NEW concepts — so no inline scaffolding and
  // no cap-driven splitting: a target with ≥8 ready contexts becomes ONE lesson.
  const baseline = withSpineBaseline(mastery, spine);

  // Mode A host (may be null) — a ready corpus/lyric phrase whose only unknown is
  // the target. The FIRST reveal card, not a standalone 1-card short-circuit.
  const host = bestReadyHost(target, baseline, spine);
  // Mode B sources: lyric windows + authored phrases (the ContextProvider seam).
  const phrases = context.contextPhrasesFor(target);

  const cards = buildEncodingVariabilityCards(target, host, phrases, baseline, opts);
  if (!cards || cards.length === 0) {
    // Defer: no ready host and no usable context. The target is not taught as a
    // card — acquired via exposure in the culminating line (Phase 5).
    return [];
  }

  const lessons = chunkCardsIntoLessons(cards, baseline, opts);
  // Hard rule (Phase 4.1+): never emit a single-card single-word TARGET lesson
  // (a lone scaffold atom). Defer instead.
  if (lessons.some((l) => l.steps.length === 1 && l.steps[0].words.length === 1)) return [];

  // R7 (≥8 or defer): a target ships a lesson only with ≥8 context reveal cards
  // — no small stub lessons. Authored-served targets that fall short THROW (a
  // data gap: missing authored phrases for this target, caught by the fixture
  // test). Unauthored targets (mock coverage pending for later sections) DEFER
  // silently — the word is acquired via the culminating line (Phase 5) until its
  // authored set lands, keeping the app runnable during incremental authoring.
  const reveals = lessons.reduce((n, l) => n + l.steps.filter((s) => revealsTarget(s, tKey)).length, 0);
  if (reveals < MIN_ENCODING_VARIABILITY_CARDS) {
    if (context.hasAuthoredContext?.(target)) assertArcEncodingVariety(lessons, target, opts.idPrefix);
    return [];
  }
  assertArcVariety(lessons, opts.idPrefix); // R8: shipped arcs are interaction-mode varied
  // R9: target-position variety — span ≥ min(2, pool) distinct positions.
  const poolPositions = new Set(usablePhrases(phrases, tKey, baseline).map((p) => targetPositionOf(p, tKey))).size;
  assertArcPositionVariety(lessons, poolPositions, tKey, target, opts.idPrefix);
  return lessons;
}

export { MIN_ENCODING_VARIABILITY_CARDS, MIN_DISTINCT_MODES };