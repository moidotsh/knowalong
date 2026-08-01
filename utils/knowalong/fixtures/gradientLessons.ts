// utils/knowalong/fixtures/gradientLessons.ts
//
// Prototype gradient lessons — hand-authored progressive CLCC sequences
// that build from atoms to composites (the "I → to like → apple → I like
// apples" vision). Each lesson is an ordered list of steps; concept steps
// introduce one CLCC, composite steps show the assembled sentence with its
// component CLCCs highlighted. Prototype data — no DB yet.

export interface GradientLessonStep {
  kind: 'concept' | 'composite';
  conceptCode?: string;
  conceptLabel?: string;
  surfaceForm: string;
  gloss: string;
  transliteration?: string | null;
  ipa?: string | null;
  examples?: Array<{ sourceText: string; translation: string }>;
  explanation: string;
  componentCodes?: string[];
}

export interface GradientLesson {
  id: string;
  title: string;
  subtitle: string;
  tierRange: string;
  stepCount: number;
  steps: GradientLessonStep[];
}

export const GRADIENT_LESSONS: readonly GradientLesson[] = [
  {
    id: 'i-want',
    title: 'Building "I want"',
    subtitle: 'From the pronoun "I" to the full phrase "I want tea"',
    tierRange: 'Tier 0',
    stepCount: 4,
    steps: [
      {
        kind: 'concept',
        conceptCode: 'FIRST_PERSON',
        conceptLabel: 'First person',
        surfaceForm: 'я',
        gloss: 'I',
        transliteration: 'ya',
        ipa: 'ja',
        explanation: 'The most basic pronoun — "I". In Russian, it\'s "я" (pronounced "ya"). This is always lowercase unless it starts a sentence.',
        examples: [],
      },
      {
        kind: 'concept',
        conceptCode: 'WANT',
        conceptLabel: 'Want / desire',
        surfaceForm: 'хотеть',
        gloss: 'to want',
        transliteration: 'khotet\'',
        ipa: 'xɐˈtʲetʲ',
        explanation: 'The verb "to want". Russian has irregular conjugation: я хочу (I want), он хочет (he wants). Note the stem change.',
        examples: [
          { sourceText: 'Я хочу чай.', translation: 'I want tea.' },
        ],
      },
      {
        kind: 'composite',
        surfaceForm: 'Я хочу',
        gloss: 'I want',
        transliteration: 'Ya khotchu',
        componentCodes: ['FIRST_PERSON', 'WANT'],
        explanation: 'Now combine them: "я" (I) + "хочу" (want-1sg) = "Я хочу" (I want). Note the verb conjugated to first person: хочу, not the infinitive хотеть.',
        examples: [],
      },
      {
        kind: 'composite',
        surfaceForm: 'Я хочу чай.',
        gloss: 'I want tea.',
        transliteration: 'Ya khotchu chai.',
        componentCodes: ['FIRST_PERSON', 'WANT'],
        explanation: 'Add an object: "чай" (tea) — a noun with no article (Russian has no articles). "Я хочу чай" = "I want tea". You just built your first complete Russian sentence from two CLCCs!',
        examples: [],
      },
    ],
  },
  {
    id: 'i-know',
    title: 'Building "I know"',
    subtitle: 'From "I" to "I know the answer"',
    tierRange: 'Tier 0-1',
    stepCount: 3,
    steps: [
      {
        kind: 'concept',
        conceptCode: 'FIRST_PERSON',
        conceptLabel: 'First person',
        surfaceForm: 'я',
        gloss: 'I',
        transliteration: 'ya',
        ipa: 'ja',
        explanation: 'You already know this one: "я" = "I".',
        examples: [],
      },
      {
        kind: 'concept',
        conceptCode: 'KNOW',
        conceptLabel: 'Know',
        surfaceForm: 'знать',
        gloss: 'to know',
        transliteration: 'znat\'',
        ipa: 'znatʲ',
        explanation: 'The verb "to know" — regular conjugation: я знаю (I know), она знает (she knows). Easy!',
        examples: [
          { sourceText: 'Я знаю ответ.', translation: 'I know the answer.' },
        ],
      },
      {
        kind: 'composite',
        surfaceForm: 'Я знаю ответ.',
        gloss: 'I know the answer.',
        transliteration: 'Ya znayu otvet.',
        componentCodes: ['FIRST_PERSON', 'KNOW'],
        explanation: '"я" (I) + "знаю" (know-1sg) + "ответ" (answer) = "Я знаю ответ". Subject + verb + object — the same word order as English. You just expressed knowledge in Russian.',
        examples: [],
      },
    ],
  },
  {
    id: 'i-go',
    title: 'Building "I am going"',
    subtitle: 'From "I" to "I am going to school"',
    tierRange: 'Tier 0-1',
    stepCount: 3,
    steps: [
      {
        kind: 'concept',
        conceptCode: 'FIRST_PERSON',
        conceptLabel: 'First person',
        surfaceForm: 'я',
        gloss: 'I',
        transliteration: 'ya',
        ipa: 'ja',
        explanation: 'Our trusty starting point: "я" = "I".',
        examples: [],
      },
      {
        kind: 'concept',
        conceptCode: 'GO',
        conceptLabel: 'Go (motion away)',
        surfaceForm: 'идти',
        gloss: 'to go (on foot, one direction)',
        transliteration: 'idti',
        ipa: 'ɪdʲˈtʲi',
        explanation: 'The verb "to go" — specifically walking in one direction (идти). The other "go" verb (ходить) is for habitual or round trips. Conjugation: я иду (I go), он идёт (he goes).',
        examples: [
          { sourceText: 'Я иду в школу.', translation: 'I am going to school.' },
        ],
      },
      {
        kind: 'composite',
        surfaceForm: 'Я иду в школу.',
        gloss: 'I am going to school.',
        transliteration: 'Ya idu v shkolu.',
        componentCodes: ['FIRST_PERSON', 'GO'],
        explanation: '"я" (I) + "иду" (go-1sg) + "в школу" (to school — "в" = "to/into", "школу" = accusative of "школа"). "Я иду в школу" = "I am going to school". You just expressed motion + destination in Russian!',
        examples: [],
      },
    ],
  },
] as const;

export function getLessonById(id: string): GradientLesson | null {
  return GRADIENT_LESSONS.find((l) => l.id === id) ?? null;
}
