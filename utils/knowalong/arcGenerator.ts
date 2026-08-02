// utils/knowalong/arcGenerator.ts
//
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md, Phase 3 /
// §3, refined Phase 3.1). buildArcForTarget produces the lessons needed to
// graduate ONE target concept (a lyric word, or the next CLCC/basic concept),
// sized to the learner's current mastery (R4) and capped on new-concept load
// (R1/R2/R3, enforced via the Phase 1 concept module).
//
// Two modes (ADR §3 steps 1–3):
//   A — the target is contextualizable NOW: some MULTI-WORD corpus phrase
//       contains it and has exactly one unknown — the target itself. That phrase
//       IS the i+1 card → a minimal one-lesson arc (§3 step 2). Reuses
//       generateLesson's phraseReadiness scoring (§3 step 1) over the spine's
//       existing phrases. (A single-word "phrase" is not context — it is
//       excluded, otherwise empty mastery would trivially contextualize every
//       target and R4 sizing would collapse.)
//   B — the target is not yet contextualizable: teach the missing prerequisite
//       PHRASES first (Phase 3.1 — compositional scaffolding), then the target.
//
// Phase 3.1 change — why mode B is no longer single-word cards. The first cut
// (Phase 3) decomposed the gradient into bare companion words and taught each as
// an isolated card ([я, вижу, знаю, …, target]). That is the rote-nothing-
// transfers style the redesign rejected, AND it throws away the gradient's
// compositional design ("not isolated infinitives — usable phrases from the
// start"). Phase 3.1 teaches the gradient's own compositional phrases in corpus
// order: the hub я in its own lesson, then я вижу / я знаю / я хочу reusing it
// (encoding variability), and so on. This is cap-safe by construction because a
// compositional card shares a lesson only when its hub is ALREADY graduated (the
// cap measures against a frozen per-lesson mastery — see chunkCardsIntoLessons).
// No new data, no inflection. A music-first learner now gets the actual
// compositional gradient as their bigger pack (R4), not a decomposed word list.
//
// Phase 3.1 also adds the mode-A-after-scaffolding retry: after each scaffolding
// word, re-check mode A — the moment teaching a prerequisite (я) makes a corpus
// phrase contextualize the target (я вижу, with вижу the sole unknown), STOP
// scaffolding and use that phrase as the target card. A corpus target with an
// unknown prerequisite is thus taught true i+1: scaffold the prerequisite, then
// reveal the target IN context. A NOVEL target (no corpus phrase contains it)
// can never be contextualized in v1 — morphological wrapping (synthesizing
// вижу собаку from nominative собака) needs real case agreement and is honestly
// deferred to the Phase 6 spine's real realization; until then a novel target is
// revealed as a single-word card. Mode A still delivers real contextual phrases
// whenever the corpus has one. The culminating full-line lesson is Phase 5.
//
// Pure + deterministic (stable corpus order; no Math.random). The hard cap is a
// correctness gate, asserted on every emitted lesson.

import type { Lesson, LessonStep } from './fixtures/decks';
import type { WordPart } from './fixtures/learningItems';
import { WORD_FADE_THRESHOLD, classifyWord, phraseReadiness, wordKey, type MasteryMap, type WordMastery } from './mastery';
import { assertLessonWithinCap, MAX_NEW_CONCEPTS_PER_CARD, MAX_NEW_CONCEPTS_PER_LESSON, newConceptKeys } from './concept';
import type { SpineProvider } from './spine';
import type { ContextPhrase, ContextProvider } from './contextProvider';

/** A target concept the arc graduates. Structurally a word part (form/gloss/role). */
export type ArcTarget = WordPart;

/** Default prerequisite-neighborhood size — the most new words an arc pre-teaches
 *  (gradient + CLCC compositional phrases) before revealing the target. Caps the
 *  worst case (a music-first learner who skipped the preliminaries); a corpus
 *  target usually stops far sooner via the mode-A retry. */
export const ARC_COMPANION_COUNT = 6;

export interface BuildArcOptions {
  /** Namespace for deterministic lesson/step ids (e.g. 'sv-verse1'). */
  idPrefix: string;
  /** How many prerequisite concepts to pre-teach at most (default ARC_COMPANION_COUNT). */
  companionCount?: number;
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

/** A single-concept card: one surface form, one word. Used only for a NOVEL
 *  target that no corpus phrase contextualizes (morphological wrapping deferred).
 *  R1/R3-clean by construction (exactly one concept). */
function singleWordStep(concept: WordPart, itemId: string): LessonStep {
  return {
    itemId,
    surfaceForm: concept.form,
    meaning: concept.gloss,
    words: [{ form: concept.form, gloss: concept.gloss, role: concept.role }],
  };
}

/** Clone a spine step under a fresh itemId so a generated card carries a unique,
 *  namespaced id (a spine step may seed more than one arc). All teaching payload
 *  (words, mode, construction, context, cloze) is carried through unchanged. */
function rebasedStep(step: LessonStep, itemId: string): LessonStep {
  return { ...step, itemId };
}

/** Is `form` graduated in `mastery`? (ADR: known = classifyWord === 'graduated'.) */
function isGraduated(form: string, mastery: MasteryMap): boolean {
  return classifyWord(mastery[wordKey(form)]) === 'graduated';
}

// ── Mode A: contextualize via an existing multi-word corpus phrase ───────

/** The best multi-word spine phrase that contextualizes `target` right now: it
 *  contains the target, the target is not yet graduated, and the target is the
 *  phrase's ONLY unknown (unknownCount === 1). Returns null if none (mode B).
 *  Reuses phraseReadiness scoring (ADR §3 step 1); shortest ready phrase wins.
 *  Called both before scaffolding (initial mode-A check) and after each
 *  scaffolding word (the retry that stops scaffolding the moment context opens). */
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

// ── Mode B (Phase 3.1): compositional scaffolding, then the target ──────

/** Ordered, target-free scaffolding steps: the foundational gradient first
 *  (compositional — a hub like я precedes the phrases that reuse it), then the
 *  CLCC ladder (the majority spine, R6). Steps containing the target are
 *  excluded so scaffolding never reveals the target as a side effect (the target
 *  is revealed deliberately, ideally via mode A). Lyric steps are NOT scaffolding
 *  (they are targets). This only orders + filters by target membership; cap-safety
 *  (≤1 new word vs the evolving mastery) is decided by the caller. */
function orderedScaffoldingSteps(target: ArcTarget, spine: SpineProvider): LessonStep[] {
  const tKey = wordKey(target.form);
  const excludesTarget = (s: LessonStep) => !s.words.some((w) => wordKey(w.form) === tKey);
  return [...spine.foundationalSteps(), ...spine.conceptSteps()].filter(excludesTarget);
}

/** Chunk an ordered card list into cap-compliant lessons. assertLessonWithinCap
 *  measures R1 (per card) and R2 (per lesson) against a FROZEN per-lesson mastery
 *  snapshot — a concept taught earlier in the SAME lesson is not yet known for
 *  the cards after it. So a card joins the current lesson only if it is R1-safe
 *  (≤1 new word vs the lesson's start mastery) and the lesson's new-concept union
 *  stays ≤3 (R2); otherwise it opens the next lesson, whose start mastery reflects
 *  everything taught so far (the hub is now graduated → its compositional phrases
 *  become R1-safe and can batch). buildCompositionalArc guarantees each card is
 *  R1-safe at its teaching point, so a fresh lesson always admits its first card.
 *  Every lesson is hard-gated via assertLessonWithinCap. */
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
      // Open a new lesson for this card. By construction it is R1-safe against
      // the updated `taught` (its sole new word is the one it teaches), so the
      // single-card lesson passes the hard gate; the flush assert is the backstop.
      flush();
      currentSteps = [card];
      currentStart = { ...taught };
      currentUnion = new Set(newConceptKeys([card], currentStart));
    }
  }
  flush();
  return lessons;
}

/** Mode B body (Phase 3.1). Teach the missing prerequisite phrases the
 *  gradient/CLCC ladder already authors — in corpus order, each cap-safe against
 *  mastery-so-far — then reveal the target. After each scaffolding word, retry
 *  mode A: the instant teaching a prerequisite contextualizes the target, stop
 *  (minimal scaffolding — R4) and use that phrase as the target card. If no host
 *  opens up (a novel target), exhaust the companion budget and reveal the target
 *  as a single-word card (morphological wrapping deferred to the Phase 6 spine). */
function buildCompositionalArc(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider, opts: BuildArcOptions): Lesson[] {
  const idPrefix = opts.idPrefix;
  const budget = opts.companionCount ?? ARC_COMPANION_COUNT;
  const evolved: MasteryMap = { ...mastery };
  const cards: LessonStep[] = [];
  let host: LessonStep | null = null;

  for (const step of orderedScaffoldingSteps(target, spine)) {
    if (cards.length >= budget) break;
    const stepNew = newConceptKeys([step], evolved);
    if (stepNew.length === 0) continue;                       // fully known — nothing to teach
    if (stepNew.length > MAX_NEW_CONCEPTS_PER_CARD) continue; // needs a prerequisite not yet graduated (e.g. мне нравится before мне) — skipped
    cards.push(rebasedStep(step, `${idPrefix}-s${cards.length + 1}`));
    for (const k of stepNew) evolved[k] = GRADUATED_RECORD;   // now known for subsequent steps + the retry
    host = bestReadyHost(target, evolved, spine);             // did teaching this word unlock a contextualizing phrase?
    if (host) break;                                          // minimal scaffolding (R4)
  }

  // The target card: a contextualizing corpus phrase if scaffolding unlocked one
  // (mode A), otherwise the target as a single word (morphology deferred).
  const targetCard: LessonStep = host ? rebasedStep(host, `${idPrefix}-target`) : singleWordStep(target, `${idPrefix}-target`);
  cards.push(targetCard);

  return chunkCardsIntoLessons(cards, mastery, opts);
}

// ── Mode B (Phase 4.1): context wrapping — never a single-word lesson ───

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

/** Mode B body (Phase 4.1). Wrap `target` in a context phrase so it is taught
 *  inside a real multi-word phrase, never as an isolated single word.
 *
 *  A phrase is wrappable when its unknown NON-target words are all SPINE words
 *  (gradient/CLCC atoms) — those are legitimate to scaffold (they are useful
 *  vocabulary and end up in their own multi-word gradient phrases). It never
 *  scaffolds a NOVEL lyric line-mate, because that would teach a complex word as
 *  a bare single-word "victim" — the exact anti-pattern this phase removes.
 *
 *  Among wrappable phrases it prefers READY ones (zero unknowns), then the one
 *  needing the fewest scaffolds. Returns null if no phrase is wrappable, so the
 *  caller falls back to the compositional gradient arc. The target may surface in
 *  up to MAX_READY_CONTEXT_PHRASES phrases (encoding variability). */
function buildContextWrappingArc(target: ArcTarget, phrases: readonly ContextPhrase[], mastery: MasteryMap, spine: SpineProvider, opts: BuildArcOptions): Lesson[] | null {
  const tKey = wordKey(target.form);
  const spineWords = new Set<string>();
  for (const step of [...spine.foundationalSteps(), ...spine.conceptSteps()]) for (const w of step.words) spineWords.add(wordKey(w.form));

  const evolved: MasteryMap = { ...mastery };
  const unknownNonTarget = (p: ContextPhrase): WordPart[] =>
    p.words.filter((w) => wordKey(w.form) !== tKey && !isGraduated(w.form, evolved));
  // Wrappable: every unknown non-target word is a scaffoldable spine atom.
  const wrappable = phrases.filter((p) => unknownNonTarget(p).every((w) => spineWords.has(wordKey(w.form))));
  if (wrappable.length === 0) return null;

  const ready = wrappable.filter((p) => unknownNonTarget(p).length === 0);
  const cards: LessonStep[] = [];
  const use = (ready.length > 0 ? ready : [...wrappable].sort((a, b) => unknownNonTarget(a).length - unknownNonTarget(b).length)).slice(0, MAX_READY_CONTEXT_PHRASES);

  // Scaffold the chosen phrases' unknown spine words (deduped) — always-funded.
  const scaffolded = new Set<string>();
  for (const p of use) {
    for (const w of unknownNonTarget(p)) {
      const k = wordKey(w.form);
      if (scaffolded.has(k)) continue;
      scaffolded.add(k);
      cards.push(singleWordStep(w, `${opts.idPrefix}-ctx`));
      evolved[k] = GRADUATED_RECORD;
    }
  }
  let phraseIdx = 0;
  for (const p of use) cards.push(contextPhraseToStep(p, `${opts.idPrefix}-p${(phraseIdx += 1)}`));

  return chunkCardsIntoLessons(cards, mastery, opts);
}

// ── Public API ──────────────────────────────────────────────────────────

/** Build the mastery-sized arc that graduates `target`. Returns [] if the target
 *  is already graduated. Resolution order: Mode A (a ready contextualizing corpus
 *  /lyric phrase); else Mode B context-wrapping (the target inside its context
 *  phrases — never a single-word lesson); else the foundational compositional
 *  fallback (gradient scaffolding, for a target with no context at all). Pure,
 *  deterministic; every lesson is hard-gated on the concept cap. */
export function buildArcForTarget(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider, context: ContextProvider, opts: BuildArcOptions): Lesson[] {
  if (isGraduated(target.form, mastery)) return []; // nothing to teach

  // Mode A: a multi-word corpus phrase already contextualizes the target
  // (ADR §3 step 2) — the phrase's only unknown is the target.
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

  // Mode B (Phase 4.1): wrap the target in a READY context phrase (its non-target
  // words already known) — the target inside a real multi-word phrase, never an
  // isolated single word. Ready-only (no line-mate scaffolding → no single-word
  // victims). Falls through to the foundational compositional arc when no phrase
  // is ready yet.
  const phrases = context.contextPhrasesFor(target);
  if (phrases.length > 0) {
    const wrapped = buildContextWrappingArc(target, phrases, mastery, spine, opts);
    if (wrapped) return wrapped;
  }

  // Foundational fallback (Phase 3.1): gradient scaffolding + the target, for a
  // target with no ready context phrase. Governed by the shared companion budget.
  return buildCompositionalArc(target, mastery, spine, opts);
}
