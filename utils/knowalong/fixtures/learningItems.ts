// utils/knowalong/fixtures/learningItems.ts
//
// Compositional learning items — the gradient. Each item BUILDS on earlier
// ones: "я" (I) → "я вижу" (I see) → "я вижу море" (I see the sea). Not
// isolated infinitives — the learner masters usable phrases from the start.
// Ordered as a gradient: atom → first-person conjugated → + object → + negation.
//
// Each item decomposes into WORDS — the chip-building interaction uses these
// to let the learner assemble the phrase from individual word chips (each
// showing the Russian word + its English gloss + a grammatical-role color).

export type WordRole = 'pronoun' | 'verb' | 'noun' | 'particle';

export interface WordPart {
  form: string;
  gloss: string;
  role: WordRole;
}

export interface ConstructionBreakdownPart {
  form: string;
  literal: string;
  note: string;
}

export interface ConstructionNote {
  intro: string;
  breakdown: ConstructionBreakdownPart[];
}

export interface ContextSentence {
  ru: string;
  en: string;
}

export interface LearningItem {
  id: string;
  surfaceForm: string;
  meaning: string;
  transliteration: string;
  ipa: string | null;
  note: string | null;
  buildsOn: string[];
  words: WordPart[];
  /** When present, the study page shows a construction-intro card BEFORE
   *  the chips — explaining the literal decomposition for non-obvious
   *  mappings (e.g. "I like" ≠ word-for-word in Russian). */
  construction?: ConstructionNote;
  /** A real sentence using the phrase, shown after the learner solves it. */
  contextSentence?: ContextSentence;
}

export const LEARNING_ITEMS: readonly LearningItem[] = [
  {
    id: '1',
    surfaceForm: 'я',
    meaning: 'I',
    transliteration: 'ya',
    ipa: 'ja',
    note: 'The pronoun "I". Always lowercase unless sentence-initial.',
    buildsOn: [],
    words: [{ form: 'я', gloss: 'I', role: 'pronoun' }],
  },
  {
    id: '2',
    surfaceForm: 'я вижу',
    meaning: 'I see',
    transliteration: 'ya vizhu',
    ipa: 'ja ˈvʲizʊ',
    note: 'я (I) + вижу (see-1sg). Regular conjugation: видеть → вижу.',
    buildsOn: ['1'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
    ],
  },
  {
    id: '3',
    surfaceForm: 'я знаю',
    meaning: 'I know',
    transliteration: 'ya znayu',
    ipa: 'ja ˈznajʊ',
    note: 'я (I) + знаю (know-1sg). Regular: знать → знаю.',
    buildsOn: ['1'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'знаю', gloss: 'know', role: 'verb' },
    ],
  },
  {
    id: '4',
    surfaceForm: 'я хочу',
    meaning: 'I want',
    transliteration: 'ya khotchu',
    ipa: 'ja xɐˈt͡ʃʊ',
    note: 'я (I) + хочу (want-1sg). Irregular stem: хотеть → хочу.',
    buildsOn: ['1'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'хочу', gloss: 'want', role: 'verb' },
    ],
  },
  {
    id: '5',
    surfaceForm: 'я иду',
    meaning: 'I am going',
    transliteration: 'ya idu',
    ipa: 'ja ɪˈdu',
    note: 'я (I) + иду (go-1sg). идти → иду. Walking in one direction.',
    buildsOn: ['1'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'иду', gloss: 'go', role: 'verb' },
    ],
  },
  {
    id: '6',
    surfaceForm: 'я живу',
    meaning: 'I live',
    transliteration: 'ya zhivu',
    ipa: 'ja ʐɨˈvu',
    note: 'я (I) + живу (live-1sg). жить → живу.',
    buildsOn: ['1'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'живу', gloss: 'live', role: 'verb' },
    ],
  },
  {
    id: '7',
    surfaceForm: 'мне нравится',
    meaning: 'I like',
    transliteration: 'mne nravitsya',
    ipa: 'mnʲe nrɐˈvʲit͡sə',
    note: 'Special: "мне" (to me) + "нравится" (is pleasing). Literally "to me, it is pleasing" = "I like it".',
    buildsOn: ['1'],
    words: [
      { form: 'мне', gloss: 'to me', role: 'pronoun' },
      { form: 'нравится', gloss: 'is pleasing', role: 'verb' },
    ],
    construction: {
      intro: "Russian doesn't say 'I like'. It says 'to me, it is pleasing' — the structure is flipped. You already know я = I. Мне is the dative form of я — 'to me'. Russian uses dative for the person experiencing the feeling.",
      breakdown: [
        { form: 'мне', literal: 'to me', note: 'the dative form of я (I)' },
        { form: 'нравится', literal: 'is pleasing', note: 'the thing being liked' },
      ],
    },
    contextSentence: { ru: 'Мне нравится музыка.', en: 'I like music.' },
  },
  {
    id: '8',
    surfaceForm: 'я не знаю',
    meaning: "I don't know",
    transliteration: 'ya ne znayu',
    ipa: 'ja nʲe ˈznajʊ',
    note: 'Add "не" (not) before the verb: я + не + знаю = "I don\'t know".',
    buildsOn: ['1', '3'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'не', gloss: 'not', role: 'particle' },
      { form: 'знаю', gloss: 'know', role: 'verb' },
    ],
    construction: {
      intro: "To negate a verb in Russian, place 'не' (not) directly before it. The word order stays the same — just slip 'не' in front of the verb.",
      breakdown: [
        { form: 'я', literal: 'I', note: 'subject (unchanged)' },
        { form: 'не', literal: 'not', note: 'negation particle — goes right before the verb' },
        { form: 'знаю', literal: 'know', note: 'the verb being negated' },
      ],
    },
    contextSentence: { ru: 'Я не знаю.', en: "I don't know." },
  },
  {
    id: '9',
    surfaceForm: 'я вижу море',
    meaning: 'I see the sea',
    transliteration: 'ya vizhu more',
    ipa: null,
    note: 'Add an object: "море" (sea). Russian has no articles — no "the".',
    buildsOn: ['1', '2'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
      { form: 'море', gloss: 'sea', role: 'noun' },
    ],
  },
  {
    id: '10',
    surfaceForm: 'я хочу чай',
    meaning: 'I want tea',
    transliteration: 'ya khotchu chai',
    ipa: null,
    note: 'Add an object: "чай" (tea). "я хочу чай" — simple subject-verb-object.',
    buildsOn: ['1', '4'],
    words: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'хочу', gloss: 'want', role: 'verb' },
      { form: 'чай', gloss: 'tea', role: 'noun' },
    ],
  },
] as const;

// ── Chip-building quiz ──────────────────────────────────────────────────

export interface WordChip {
  id: string;
  form: string;
  gloss: string;
  role: WordRole;
  isCorrect: boolean;
  correctPosition: number;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Collect distractor words from other items (for the chip bank). */
function getDistractors(currentItem: LearningItem, count: number): WordPart[] {
  const pool: WordPart[] = [];
  for (const item of LEARNING_ITEMS) {
    if (item.id === currentItem.id) continue;
    for (const w of item.words) {
      // Don't duplicate a word that's already in the target phrase.
      if (currentItem.words.some((cw) => cw.form === w.form)) continue;
      pool.push(w);
    }
  }
  return shuffle(pool).slice(0, count);
}

export interface BuildQuestion {
  item: LearningItem;
  /** The English meaning the learner must build in Russian. */
  prompt: string;
  /** All chips (correct + distractors), shuffled. */
  chips: WordChip[];
  /** The number of answer slots (= item.words.length). */
  slotCount: number;
}

export function buildQuestion(item: LearningItem): BuildQuestion {
  const correctChips: WordChip[] = item.words.map((w, i) => ({
    id: `correct-${i}`,
    form: w.form,
    gloss: w.gloss,
    role: w.role,
    isCorrect: true,
    correctPosition: i,
  }));
  const distractorCount = Math.max(2, 5 - item.words.length);
  const distractors = getDistractors(item, distractorCount).map((w, i) => ({
    id: `distractor-${i}`,
    form: w.form,
    gloss: w.gloss,
    role: w.role,
    isCorrect: false,
    correctPosition: -1,
  }));
  return {
    item,
    prompt: item.meaning,
    chips: shuffle([...correctChips, ...distractors]),
    slotCount: item.words.length,
  };
}

export function buildQuiz(): BuildQuestion[] {
  return LEARNING_ITEMS.map((item) => buildQuestion(item));
}

// ── Role colors (used by the study page) ────────────────────────────────

export const ROLE_COLOR_KEYS: Record<WordRole, 'brand' | 'success' | 'warning' | 'textMuted'> = {
  pronoun: 'brand',
  verb: 'success',
  noun: 'warning',
  particle: 'textMuted',
};
