// utils/knowalong/arcGenerator.ts
//
// The dynamic arc generator (ADR: mastery-driven-generation-adr.md, Phase 3 /
// §3). buildArcForTarget produces the lessons needed to graduate ONE target
// concept (a lyric word, or the next CLCC/basic concept), sized to the learner's
// current mastery (R4) and capped on new-concept load (R1/R2/R3, enforced via
// the Phase 1 concept module).
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
//       vocabulary first (each concept its own card; ≤1 new/card, ≤3 new/lesson),
//       then the target card (§3 step 3). More missing prerequisites → more
//       lessons → larger pack (R4).
//
// Pure + deterministic (stable companion order; no Math.random). The hard cap
// is a correctness gate: v1 construction (single-concept cards, ≤3/lesson)
// cannot violate it, so assertLessonWithinCap never throws on the happy path.
//
// v1 scope (flagged for later): mode B cards are single surface forms
// (prerequisite pre-teach + target). Richer phrase-wrapping for novel targets —
// a multi-word card combining the target with the just-taught companions —
// needs morphology-safe templates or the Phase 6 spine's real realization, and
// is deferred. Mode A already delivers real contextual phrases whenever the
// corpus has one. The culminating full-line lesson is Phase 5, not here.

import type { Lesson, LessonStep } from './fixtures/decks';
import type { WordPart } from './fixtures/learningItems';
import { WORD_FADE_THRESHOLD, classifyWord, phraseReadiness, wordKey, type MasteryMap, type WordMastery } from './mastery';
import { assertLessonWithinCap, MAX_NEW_CONCEPTS_PER_LESSON } from './concept';
import type { SpineProvider } from './spine';

/** A target concept the arc graduates. Structurally a word part (form/gloss/role). */
export type ArcTarget = WordPart;

/** Default prerequisite-neighborhood size — the reusable spine words the arc
 *  pre-teaches (when the learner lacks them) before revealing the target. */
export const ARC_COMPANION_COUNT = 6;

export interface BuildArcOptions {
  /** Namespace for deterministic lesson/step ids (e.g. 'sv-verse1'). */
  idPrefix: string;
  /** How many prerequisite companions to consider (default ARC_COMPANION_COUNT). */
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

/** A single-concept card: one surface form, one word. R1/R3-clean by
 *  construction (exactly one concept per card). */
function singleWordStep(concept: WordPart, itemId: string): LessonStep {
  return {
    itemId,
    surfaceForm: concept.form,
    meaning: concept.gloss,
    words: [{ form: concept.form, gloss: concept.gloss, role: concept.role }],
  };
}

/** Is `form` graduated in `mastery`? (ADR: known = classifyWord === 'graduated'.) */
function isGraduated(form: string, mastery: MasteryMap): boolean {
  return classifyWord(mastery[wordKey(form)]) === 'graduated';
}

// ── Mode A: contextualize via an existing multi-word corpus phrase ───────

/** The best multi-word spine phrase that contextualizes `target` right now: it
 *  contains the target, the target is not yet graduated, and the target is the
 *  phrase's ONLY unknown (unknownCount === 1). Returns null if none (mode B).
 *  Reuses phraseReadiness scoring (ADR §3 step 1); shortest ready phrase wins. */
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

// ── Mode B: teach prerequisites first, then the target ──────────────────

/** Deterministic prerequisite companions for `target`: distinct reusable spine
 *  words (gradient + CLCC — the R6 majority spine; never lyric words), excluding
 *  the target, in stable corpus order. Capped at `count`. */
function selectCompanions(target: ArcTarget, spine: SpineProvider, count: number): WordPart[] {
  const tKey = wordKey(target.form);
  const seen = new Set<string>();
  const out: WordPart[] = [];
  const consider = (w: WordPart) => {
    const k = wordKey(w.form);
    if (k === tKey || seen.has(k)) return;
    seen.add(k);
    out.push({ form: w.form, gloss: w.gloss, role: w.role });
  };
  for (const step of spine.foundationalSteps()) for (const w of step.words) consider(w);
  for (const step of spine.conceptSteps()) for (const w of step.words) consider(w);
  return out.slice(0, count);
}

/** Chunk an ordered concept list into cap-compliant lessons (≤3 new/lesson),
 *  evolving the known set across lessons so the Phase 1 cap is measured against
 *  what the learner knows at the start of each lesson. Each card is a single
 *  concept (R1/R3). Hard-gates every lesson via assertLessonWithinCap. */
function chunkIntoLessons(concepts: WordPart[], mastery: MasteryMap, opts: BuildArcOptions): Lesson[] {
  const icon = opts.icon ?? 'sparkles';
  const title = opts.title ?? opts.idPrefix;
  const evolved: MasteryMap = { ...mastery }; // grows as concepts are taught
  const lessons: Lesson[] = [];
  for (let i = 0; i < concepts.length; i += MAX_NEW_CONCEPTS_PER_LESSON) {
    const slice = concepts.slice(i, i + MAX_NEW_CONCEPTS_PER_LESSON);
    const lessonIndex = lessons.length + 1;
    const steps = slice.map((c, j) => singleWordStep(c, `${opts.idPrefix}-l${lessonIndex}-c${j + 1}`));
    const lesson: Lesson = {
      id: `${opts.idPrefix}-l${lessonIndex}`,
      title: lessonIndex === 1 ? title : `${title} · ${lessonIndex}`,
      subtitle: opts.subtitle ?? `${slice.length} concept${slice.length === 1 ? '' : 's'}`,
      icon,
      steps,
      stepCount: steps.length,
    };
    assertLessonWithinCap(lesson, evolved); // hard gate (R1/R2/R3)
    lessons.push(lesson);
    for (const c of slice) evolved[wordKey(c.form)] = GRADUATED_RECORD; // now known for later lessons
  }
  return lessons;
}

// ── Public API ──────────────────────────────────────────────────────────

/** Build the mastery-sized arc that graduates `target`. Mode A (a minimal,
 *  contextualizing corpus phrase) when one is ready; mode B (teach missing
 *  prerequisites, then the target) otherwise. Pure, deterministic, never throws
 *  on correct output (the hard cap is a construction invariant in v1). */
export function buildArcForTarget(target: ArcTarget, mastery: MasteryMap, spine: SpineProvider, opts: BuildArcOptions): Lesson[] {
  // Mode A: a multi-word corpus phrase already contextualizes the target
  // (ADR §3 step 2) — the phrase's only unknown is the target.
  const host = bestReadyHost(target, mastery, spine);
  if (host) {
    const step: LessonStep = { ...host, itemId: `${opts.idPrefix}-host` };
    const lesson: Lesson = {
      id: `${opts.idPrefix}-l1`,
      title: opts.title ?? opts.idPrefix,
      subtitle: opts.subtitle ?? host.meaning,
      icon: opts.icon ?? 'sparkles',
      steps: [step],
      stepCount: 1,
    };
    assertLessonWithinCap(lesson, mastery); // hard gate
    return [lesson];
  }

  // Mode B: teach the missing prerequisites, then the target (ADR §3 step 3).
  const companionCount = opts.companionCount ?? ARC_COMPANION_COUNT;
  const companions = selectCompanions(target, spine, companionCount);
  const toTeach: WordPart[] = [
    ...companions.filter((c) => !isGraduated(c.form, mastery)),
    ...(isGraduated(target.form, mastery) ? [] : [target]),
  ];
  return chunkIntoLessons(toTeach, mastery, opts);
}
