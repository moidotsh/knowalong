// utils/knowalong/fixtures/learningItems.ts
//
// Compositional learning items — the gradient. Each item BUILDS on earlier
// ones: "я" (I) → "я вижу" (I see) → "я вижу море" (I see the sea). Not
// isolated infinitives — the learner masters usable phrases from the start.
// Ordered as a gradient: atom → first-person conjugated → + object → + negation.

export interface LearningItem {
  id: string;
  surfaceForm: string;
  meaning: string;
  transliteration: string;
  ipa: string | null;
  note: string | null;
  buildsOn: string[];
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
  },
  {
    id: '2',
    surfaceForm: 'я вижу',
    meaning: 'I see',
    transliteration: 'ya vizhu',
    ipa: 'ja ˈvʲizʊ',
    note: 'я (I) + вижу (see-1sg). Regular conjugation: видеть → вижу.',
    buildsOn: ['1'],
  },
  {
    id: '3',
    surfaceForm: 'я знаю',
    meaning: 'I know',
    transliteration: 'ya znayu',
    ipa: 'ja ˈznajʊ',
    note: 'я (I) + знаю (know-1sg). Regular: знать → знаю.',
    buildsOn: ['1'],
  },
  {
    id: '4',
    surfaceForm: 'я хочу',
    meaning: 'I want',
    transliteration: 'ya khotchu',
    ipa: 'ja xɐˈt͡ʃʊ',
    note: 'я (I) + хочу (want-1sg). Irregular stem: хотеть → хочу.',
    buildsOn: ['1'],
  },
  {
    id: '5',
    surfaceForm: 'я иду',
    meaning: 'I am going',
    transliteration: 'ya idu',
    ipa: 'ja ɪˈdu',
    note: 'я (I) + иду (go-1sg). идти → иду. Walking in one direction.',
    buildsOn: ['1'],
  },
  {
    id: '6',
    surfaceForm: 'я живу',
    meaning: 'I live',
    transliteration: 'ya zhivu',
    ipa: 'ja ʐɨˈvu',
    note: 'я (I) + живу (live-1sg). жить → живу.',
    buildsOn: ['1'],
  },
  {
    id: '7',
    surfaceForm: 'мне нравится',
    meaning: 'I like',
    transliteration: 'mne nravitsya',
    ipa: 'mnʲe nrɐˈvʲit͡sə',
    note: 'Special construction: "мне" (to me) + "нравится" (pleases). Literally "it pleases me" = "I like it".',
    buildsOn: ['1'],
  },
  {
    id: '8',
    surfaceForm: 'я не знаю',
    meaning: "I don't know",
    transliteration: 'ya ne znayu',
    ipa: 'ja nʲe ˈznajʊ',
    note: 'Add "не" (not) before the verb: я + не + знаю = "I don\'t know".',
    buildsOn: ['1', '3'],
  },
  {
    id: '9',
    surfaceForm: 'я вижу море',
    meaning: 'I see the sea',
    transliteration: 'ya vizhu more',
    ipa: null,
    note: 'Add an object: "море" (sea). Russian has no articles — no "the".',
    buildsOn: ['1', '2'],
  },
  {
    id: '10',
    surfaceForm: 'я хочу чай',
    meaning: 'I want tea',
    transliteration: 'ya khotchu chai',
    ipa: null,
    note: 'Add an object: "чай" (tea). "я хочу чай" — simple subject-verb-object.',
    buildsOn: ['1', '4'],
  },
] as const;

export interface QuizQuestion {
  item: LearningItem;
  /** 'recognize' = show Russian, pick English. 'produce' = show English, pick Russian. */
  mode: 'recognize' | 'produce';
  /** The prompt text (Russian for recognize, English for produce). */
  prompt: string;
  /** The 4 options (shuffled). */
  options: string[];
  /** Index of the correct option. */
  correctIndex: number;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a Duolingo-style multiple-choice question for one learning item.
 * Alternates between 'recognize' (Russian → English) and 'produce'
 * (English → Russian) modes. Distractors are drawn from other items.
 */
export function buildQuestion(item: LearningItem, allItems: readonly LearningItem[], mode: 'recognize' | 'produce'): QuizQuestion {
  const correctAnswer = mode === 'recognize' ? item.meaning : item.surfaceForm;
  const distractorPool = allItems
    .filter((i) => i.id !== item.id)
    .map((i) => (mode === 'recognize' ? i.meaning : i.surfaceForm));
  const distractors = shuffle(distractorPool).slice(0, 3);
  const options = shuffle([correctAnswer, ...distractors]);
  return {
    item,
    mode,
    prompt: mode === 'recognize' ? item.surfaceForm : item.meaning,
    options,
    correctIndex: options.indexOf(correctAnswer),
  };
}

/** Build the full quiz: one question per item, alternating modes. */
export function buildQuiz(): QuizQuestion[] {
  return LEARNING_ITEMS.map((item, i) =>
    buildQuestion(item, LEARNING_ITEMS, i % 2 === 0 ? 'recognize' : 'produce'),
  );
}
