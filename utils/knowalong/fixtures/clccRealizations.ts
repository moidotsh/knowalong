// utils/knowalong/fixtures/clccRealizations.ts
//
// Prototype CLCC realization data — mock concept_realizations rows the
// flashcard study UI renders. These are hand-authored Russian tier 0-1
// CLCCs with the full publish-contract shape (surface_form, gloss, ipa,
// transliteration, examples, prerequisites, enables, frequency_rank).
// When the Supabase is wired, these are replaced by real queries.

export interface ClccRealization {
  coreConceptCode: string;
  conceptLabel: string;
  conceptDescription: string;
  tier: number;
  functionalCluster: string;
  languageCode: string;
  realizationType: 'word' | 'phrase' | 'construction' | 'feature' | 'morpheme';
  surfaceForm: string;
  gloss: string | null;
  grammaticalNote: string | null;
  ipa: string | null;
  transliteration: string | null;
  frequencyRank: number | null;
  prerequisites: string[];
  enables: string[];
  examples: Array<{
    sourceText: string;
    translation: string;
    sourceCorpus: string;
    sourceAttribution: string;
  }> | null;
}

export const CLCC_REALIZATIONS: readonly ClccRealization[] = [
  {
    coreConceptCode: 'FIRST_PERSON',
    conceptLabel: 'First person',
    conceptDescription: 'Reference to the speaker/writer.',
    tier: 0,
    functionalCluster: 'pronoun',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'я',
    gloss: 'I',
    grammaticalNote: 'Personal pronoun, nominative singular.',
    ipa: 'ja',
    transliteration: 'ya',
    frequencyRank: 8,
    prerequisites: [],
    enables: ['EXIST', 'WANT', 'LIKE_PREFER', 'SAY'],
    examples: [
      { sourceText: 'Я иду домой.', translation: 'I am going home.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Я знаю ответ.', translation: 'I know the answer.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'EXIST',
    conceptLabel: 'Existence / being',
    conceptDescription: 'Affirming that something exists or is the case.',
    tier: 0,
    functionalCluster: 'existence',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'быть',
    gloss: 'to be',
    grammaticalNote: 'Infinitive. Russian "быть" has no present-tense form — it is implied.',
    ipa: 'bɨtʲ',
    transliteration: 'byt\'',
    frequencyRank: 12,
    prerequisites: [],
    enables: ['PAST_TENSE', 'FUTURE_TENSE'],
    examples: [
      { sourceText: 'Я хочу быть врачом.', translation: 'I want to be a doctor.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'WANT',
    conceptLabel: 'Want / desire',
    conceptDescription: 'Expression of desire.',
    tier: 0,
    functionalCluster: 'volition',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'хотеть',
    gloss: 'to want',
    grammaticalNote: 'Irregular conjugation (1sg хочу, 3sg хочет).',
    ipa: 'xɐˈtʲetʲ',
    transliteration: 'khotet\'',
    frequencyRank: 45,
    prerequisites: ['FIRST_PERSON'],
    enables: [],
    examples: [
      { sourceText: 'Я хочу чай.', translation: 'I want tea.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Она хочет домой.', translation: 'She wants to go home.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'NEGATION',
    conceptLabel: 'Negation',
    conceptDescription: 'Denial or absence of something.',
    tier: 0,
    functionalCluster: 'negation',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'не',
    gloss: 'not',
    grammaticalNote: 'Particle placed directly before the verb or word being negated.',
    ipa: 'nʲe',
    transliteration: 'ne',
    frequencyRank: 5,
    prerequisites: [],
    enables: [],
    examples: [
      { sourceText: 'Я не знаю.', translation: 'I don\'t know.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Она не хочет.', translation: 'She doesn\'t want to.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'GO',
    conceptLabel: 'Go (motion away)',
    conceptDescription: 'Movement away from a deictic center.',
    tier: 1,
    functionalCluster: 'motion',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'идти',
    gloss: 'to go (on foot, one direction)',
    grammaticalNote: 'Unidirectional imperfective. Contrast with ходить (multidirectional).',
    ipa: 'ɪdʲˈtʲi',
    transliteration: 'idti',
    frequencyRank: 78,
    prerequisites: ['FIRST_PERSON'],
    enables: ['COME', 'MOVE_TO'],
    examples: [
      { sourceText: 'Я иду в школу.', translation: 'I am going to school.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Куда ты идёшь?', translation: 'Where are you going?', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'LIKE_PREFER',
    conceptLabel: 'Like / prefer',
    conceptDescription: 'Expression of preference or liking.',
    tier: 1,
    functionalCluster: 'volition',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'нравиться',
    gloss: 'to like / to please',
    grammaticalNote: 'Impersonal construction: "Мне нравится X" = "X pleases me" = "I like X".',
    ipa: 'nʲrɐˈvʲit͡sə',
    transliteration: 'nravit\'sya',
    frequencyRank: 234,
    prerequisites: ['FIRST_PERSON', 'EXIST'],
    enables: [],
    examples: [
      { sourceText: 'Мне нравится музыка.', translation: 'I like music.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Тебе нравится这本书?', translation: 'Do you like this book?', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'SEE',
    conceptLabel: 'See',
    conceptDescription: 'Visual perception.',
    tier: 1,
    functionalCluster: 'perception',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'видеть',
    gloss: 'to see',
    grammaticalNote: 'Irregular: 1sg вижу, 3sg видит.',
    ipa: 'ˈvʲidʲɪtʲ',
    transliteration: 'videt\'',
    frequencyRank: 89,
    prerequisites: ['EXIST'],
    enables: [],
    examples: [
      { sourceText: 'Я вижу море.', translation: 'I see the sea.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'KNOW',
    conceptLabel: 'Know',
    conceptDescription: 'Possession of knowledge or awareness.',
    tier: 1,
    functionalCluster: 'cognition',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'знать',
    gloss: 'to know',
    grammaticalNote: 'Regular conjugation (1sg знаю, 3sg знает).',
    ipa: 'znatʲ',
    transliteration: 'znat\'',
    frequencyRank: 56,
    prerequisites: ['EXIST'],
    enables: ['THINK', 'UNDERSTAND'],
    examples: [
      { sourceText: 'Я знаю этот город.', translation: 'I know this city.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
      { sourceText: 'Она знает французский.', translation: 'She knows French.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'SAY',
    conceptLabel: 'Say',
    conceptDescription: 'Verbal communication.',
    tier: 1,
    functionalCluster: 'communication',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'сказать',
    gloss: 'to say / to tell',
    grammaticalNote: 'Perfective. Imperfective: говорить.',
    ipa: 'skɐˈzatʲ',
    transliteration: 'skazat\'',
    frequencyRank: 67,
    prerequisites: ['FIRST_PERSON'],
    enables: [],
    examples: [
      { sourceText: 'Он сказал правду.', translation: 'He told the truth.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
  {
    coreConceptCode: 'LIVE_STAY',
    conceptLabel: 'Live / stay / reside',
    conceptDescription: 'Inhabiting or remaining in a place.',
    tier: 1,
    functionalCluster: 'location',
    languageCode: 'ru',
    realizationType: 'word',
    surfaceForm: 'жить',
    gloss: 'to live',
    grammaticalNote: 'Regular conjugation (1sg живу, 3sg живёт).',
    ipa: 'ʐɨtʲ',
    transliteration: 'zhit\'',
    frequencyRank: 102,
    prerequisites: ['EXIST'],
    enables: [],
    examples: [
      { sourceText: 'Я живу в Москве.', translation: 'I live in Moscow.', sourceCorpus: 'tatoeba', sourceAttribution: 'CK' },
    ],
  },
] as const;

/** Ordered by tier (ascending) then frequency_rank (ascending) — the gradient. */
export function getStudyQueue(): ClccRealization[] {
  return [...CLCC_REALIZATIONS].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (a.frequencyRank ?? 999) - (b.frequencyRank ?? 999);
  });
}
