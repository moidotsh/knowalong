// utils/knowalong/songCurriculum.ts
//
// The i+1 lesson assembler for song teaching. Replaces the old "teach the
// whole lyric line in one dense lesson" model with: one **arc lesson per
// target lyric word** (the word reused in several *known* contexts — encoding
// variability), followed by a **culminating lesson** whose single card is the
// full lyric line, now 100% comprehensible because every word in it was
// acquired in its arc.
//
// The spine that scaffolds the context cards (CLCC + gradient + basicWords)
// is mastery-keyed by `form`, so a word graduated anywhere — including one
// seeded inside an earlier arc card — counts as known in the culminating line.
// "It all counts": there is no separate music vs CLCC progress.
//
// Pure + deterministic (index-based ids; no module-level counters).

import type { Lesson, LessonStep } from './fixtures/decks';
import type { WordRole } from './fixtures/learningItems';

/** A single chip-builder card. The author ensures each card carries **≤1 new
 *  word** (i+1); every other word on the card is already-known spine. The new
 *  word may be a lyric target OR a CLCC/basic word being taught in-music. */
export interface ArcCard {
  surfaceForm: string;
  meaning: string;
  words: ReadonlyArray<{ form: string; gloss: string; role: WordRole }>;
  note?: string | null;
  contextSentence?: { ru: string; en: string };
  mode?: LessonStep['mode'];
}

/** An arc = one target lyric word/concept + its context cards. */
export interface LyricWordArc {
  target: string; // the new word's form (lesson title)
  meaning: string; // short gloss (lesson subtitle)
  cards: ArcCard[]; // context cards, ≤~2 new words across the whole arc
}

export interface BuildArcOptions {
  idPrefix: string; // e.g. 'sv-intro' — lesson/step ids are derived from it
  icon?: Lesson['icon']; // default 'sparkles'
  sectionLabel?: string; // lesson title prefix, e.g. 'Intro'
}

function toStep(c: ArcCard, id: string): LessonStep {
  return {
    itemId: id,
    surfaceForm: c.surfaceForm,
    meaning: c.meaning,
    words: c.words.map((w) => ({ form: w.form, gloss: w.gloss, role: w.role })),
    note: c.note ?? null,
    contextSentence: c.contextSentence,
    mode: c.mode,
  };
}

/** Build one lesson per arc (each arc ≈ one target word, ≤~2 new words) and
 *  append a culminating lesson whose single card is the full lyric line. */
export function buildArcLessons(
  arcs: ReadonlyArray<LyricWordArc>,
  culmination: ArcCard,
  opts: BuildArcOptions,
): Lesson[] {
  const icon = opts.icon ?? 'sparkles';
  const label = opts.sectionLabel ? `${opts.sectionLabel} · ` : '';
  const lessons: Lesson[] = [];
  arcs.forEach((arc, i) => {
    const steps = arc.cards.map((c, j) => toStep(c, `${opts.idPrefix}-a${i + 1}-c${j + 1}`));
    lessons.push({
      id: `${opts.idPrefix}-a${i + 1}`,
      title: `${label}${arc.target}`,
      subtitle: arc.meaning,
      icon,
      steps,
      stepCount: steps.length,
    });
  });
  lessons.push({
    id: `${opts.idPrefix}-line`,
    title: `${label}full line`,
    subtitle: 'culminating line',
    icon,
    steps: [toStep(culmination, `${opts.idPrefix}-line`)],
    stepCount: 1,
  });
  return lessons;
}

// ── Authored Intro curriculum (the worked section) ─────────────────────
// Intro line: "А, будто полетев фантомом, а" ("Ah, as if flying like a phantom").
// Scaffolding = the gradient's known words: я / вижу / знаю / хочу.
// Each card introduces ≤1 new word; each arc ≈ the lyric target + a base form.

const INTRO_ARCS: ReadonlyArray<LyricWordArc> = [
  {
    target: 'эй',
    meaning: 'Hey — a casual interjection',
    cards: [
      {
        surfaceForm: 'эй',
        meaning: 'Hey',
        words: [{ form: 'эй', gloss: 'hey', role: 'particle' }],
        note: 'A casual interjection — "hey" or "yo". Grabs attention / sets a mood.',
        contextSentence: { ru: 'Эй', en: 'Hey' },
      },
      {
        surfaceForm: 'эй, я вижу',
        meaning: 'Hey, I see',
        words: [
          { form: 'эй', gloss: 'hey', role: 'particle' },
          { form: 'я', gloss: 'I', role: 'pronoun' },
          { form: 'вижу', gloss: 'see', role: 'verb' },
        ],
        contextSentence: { ru: 'Эй, я вижу', en: 'Hey, I see' },
      },
    ],
  },
  {
    target: 'будто',
    meaning: 'As if — introduces a comparison',
    cards: [
      {
        surfaceForm: 'будто',
        meaning: 'As if',
        words: [{ form: 'будто', gloss: 'as if', role: 'particle' }],
        note: '"As if / as though" — introduces a comparison or metaphor.',
        contextSentence: { ru: 'будто', en: 'as if' },
      },
      {
        surfaceForm: 'будто я знаю',
        meaning: 'As if I know',
        words: [
          { form: 'будто', gloss: 'as if', role: 'particle' },
          { form: 'я', gloss: 'I', role: 'pronoun' },
          { form: 'знаю', gloss: 'know', role: 'verb' },
        ],
        contextSentence: { ru: 'Будто я знаю', en: 'As if I know' },
      },
    ],
  },
  {
    target: 'полетев',
    meaning: 'Having flown — a past gerund',
    cards: [
      {
        surfaceForm: 'летать',
        meaning: 'To fly',
        words: [{ form: 'летать', gloss: 'to fly', role: 'verb' }],
        note: 'Infinitive "to fly" (general/habitual) — the base verb behind "полетев".',
        contextSentence: { ru: 'Я хочу летать', en: 'I want to fly' },
      },
      {
        surfaceForm: 'полетев',
        meaning: 'Having flown',
        words: [{ form: 'полетев', gloss: 'having flown', role: 'verb' }],
        note: 'A past gerund (деепричастие) — "having flown". Russian-specific; no clean English equivalent.',
        contextSentence: { ru: 'полетев', en: 'having flown' },
      },
    ],
  },
  {
    target: 'фантомом',
    meaning: 'Phantom — instrumental case',
    cards: [
      {
        surfaceForm: 'фантом',
        meaning: 'Phantom',
        words: [{ form: 'фантом', gloss: 'phantom', role: 'noun' }],
        note: 'A phantom/ghost — nominative (dictionary form).',
        contextSentence: { ru: 'это фантом', en: 'this is a phantom' },
      },
      {
        surfaceForm: 'фантомом',
        meaning: 'As a phantom',
        words: [{ form: 'фантомом', gloss: 'phantom (instr.)', role: 'noun' }],
        note: 'Instrumental case (фантом + ом) — "as a phantom" / "by means of a phantom".',
        contextSentence: { ru: 'как фантомом', en: 'like a phantom' },
      },
    ],
  },
];

const INTRO_CULMINATION: ArcCard = {
  surfaceForm: 'А, будто полетев фантомом',
  meaning: 'Ah, as if flying like a phantom',
  words: [
    { form: 'а', gloss: 'ah', role: 'particle' },
    { form: 'будто', gloss: 'as if', role: 'particle' },
    { form: 'полетев', gloss: 'having flown', role: 'verb' },
    { form: 'фантомом', gloss: 'phantom', role: 'noun' },
  ],
  note: 'The intro line assembled — every word now acquired. "А" is a sighing particle ("ah"), not the conjunction.',
  contextSentence: { ru: 'А, будто полетев фантомом, а', en: 'Ah, as if flying like a phantom, ah' },
};

/** The rebuilt Intro sub-deck lessons: 4 arc lessons (эй / будто / полетев /
 *  фантомом) + 1 culminating line lesson. */
export const INTRO_LESSONS: Lesson[] = buildArcLessons(INTRO_ARCS, INTRO_CULMINATION, {
  idPrefix: 'sv-intro',
  sectionLabel: 'Intro',
});
