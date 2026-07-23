// shared/fixtures/demoSources.ts
// Original, non-copyrighted, KnowAlong-owned fixture content for demo
// mode. The source ("Звёздная река") is a fictional song attributed to a
// fictional ensemble ("Ансамбль Тихий Свет"). The Russian lines are
// original prose composed for this fixture; they are NOT a real song and
// are NOT derived from any copyrighted work.
//
// These fixtures power the demo adapter (no Supabase required) and the
// /dev/knowalong showcase. They never ship to production data.

import type {
  LearningSource,
  SourceSection,
  SourceLine,
  LexicalLemma,
  LexicalForm,
  TokenOccurrence,
} from '../types/knowalong';

const NOW = '2026-07-22T00:00:00.000Z';

export const DEMO_SOURCE_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

const DEMO_LEMMA_RIVER_ID = '00000000-0000-0000-0000-000000000010';
const DEMO_LEMMA_STAR_ID = '00000000-0000-0000-0000-000000000011';
const DEMO_LEMMA_SING_ID = '00000000-0000-0000-0000-000000000012';
const DEMO_FORM_RIVER_ID = '00000000-0000-0000-0000-000000000020';
const DEMO_FORM_STAR_ID = '00000000-0000-0000-0000-000000000021';
const DEMO_FORM_SINGING_ID = '00000000-0000-0000-0000-000000000022';

const SECTION_VERSE_1_ID = '00000000-0000-0000-0000-000000000030';
const SECTION_CHORUS_ID = '00000000-0000-0000-0000-000000000031';
const SECTION_VERSE_2_ID = '00000000-0000-0000-0000-000000000032';

const LINE_1_ID = '00000000-0000-0000-0000-000000000040';
const LINE_2_ID = '00000000-0000-0000-0000-000000000041';
const LINE_3_ID = '00000000-0000-0000-0000-000000000042';
const LINE_4_ID = '00000000-0000-0000-0000-000000000043';
const LINE_5_ID = '00000000-0000-0000-0000-000000000044';
const LINE_6_ID = '00000000-0000-0000-0000-000000000045';

export const demoSource: LearningSource = {
  id: DEMO_SOURCE_ID,
  userId: DEMO_USER_ID,
  sourceType: 'lyrics',
  title: 'Звёздная река',
  artist: 'Ансамбль Тихий Свет',
  targetLanguage: 'ru',
  translationLanguage: 'en',
  notes: 'Original fixture content composed for KnowAlong demo mode.',
  sourceContentHash: 'demo-hash-0001',
  processingStatus: 'analyzed',
  createdAt: NOW,
  updatedAt: NOW,
};

export const demoSections: SourceSection[] = [
  {
    id: SECTION_VERSE_1_ID,
    sourceId: DEMO_SOURCE_ID,
    ordinal: 0,
    sectionType: 'verse',
    label: 'Куплет 1',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: SECTION_CHORUS_ID,
    sourceId: DEMO_SOURCE_ID,
    ordinal: 1,
    sectionType: 'chorus',
    label: 'Припев',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: SECTION_VERSE_2_ID,
    sourceId: DEMO_SOURCE_ID,
    ordinal: 2,
    sectionType: 'verse',
    label: 'Куплет 2',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const demoLines: SourceLine[] = [
  {
    id: LINE_1_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_VERSE_1_ID,
    ordinal: 0,
    rawText: 'Звёздная река течёт тихо.',
    normalizedText: 'звёздная река течёт тихо',
    translation: 'The starry river flows quietly.',
    transliteration: 'Zvyozdnaya reka techyot tikho.',
    reviewStatus: 'recognized',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: LINE_2_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_VERSE_1_ID,
    ordinal: 1,
    rawText: 'Свет поёт над водой.',
    normalizedText: 'свет поёт над водой',
    translation: 'Light sings above the water.',
    transliteration: 'Svet podyot nad vodoy.',
    reviewStatus: 'seen',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: LINE_3_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_CHORUS_ID,
    ordinal: 2,
    rawText: 'О, река, неси меня домой.',
    normalizedText: 'о река неси меня домой',
    translation: 'Oh, river, carry me home.',
    transliteration: 'O, reka, nesi menya domoy.',
    reviewStatus: 'learning',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: LINE_4_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_CHORUS_ID,
    ordinal: 3,
    rawText: 'Где звёзды знают мой путь.',
    normalizedText: 'где звёзды знают мой путь',
    translation: 'Where the stars know my path.',
    transliteration: 'Gde zvyozdy znayut moy put\'.',
    reviewStatus: 'new',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: LINE_5_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_VERSE_2_ID,
    ordinal: 4,
    rawText: 'Тихий свет ведёт меня.',
    normalizedText: 'тихий свет ведёт меня',
    translation: 'The quiet light leads me.',
    transliteration: 'Tikhiy svet vedyot menya.',
    reviewStatus: 'new',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: LINE_6_ID,
    sourceId: DEMO_SOURCE_ID,
    sectionId: SECTION_VERSE_2_ID,
    ordinal: 5,
    rawText: 'И река поёт со мной.',
    normalizedText: 'и река поёт со мной',
    translation: 'And the river sings with me.',
    transliteration: 'I reka podyot so mnoy.',
    reviewStatus: 'new',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const demoLemmas: LexicalLemma[] = [
  {
    id: DEMO_LEMMA_RIVER_ID,
    userId: DEMO_USER_ID,
    languageCode: 'ru',
    normalizedLemma: 'река',
    partOfSpeech: 'noun',
    primaryGloss: 'river',
    grammaticalGender: 'feminine',
    animacy: null,
    verbAspect: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: DEMO_LEMMA_STAR_ID,
    userId: DEMO_USER_ID,
    languageCode: 'ru',
    normalizedLemma: 'звезда',
    partOfSpeech: 'noun',
    primaryGloss: 'star',
    grammaticalGender: 'feminine',
    animacy: null,
    verbAspect: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: DEMO_LEMMA_SING_ID,
    userId: DEMO_USER_ID,
    languageCode: 'ru',
    normalizedLemma: 'петь',
    partOfSpeech: 'verb',
    primaryGloss: 'to sing',
    grammaticalGender: null,
    animacy: null,
    verbAspect: 'imperfective',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const demoForms: LexicalForm[] = [
  {
    id: DEMO_FORM_RIVER_ID,
    lemmaId: DEMO_LEMMA_RIVER_ID,
    surfaceForm: 'реку',
    morphologySummary: 'accusative, singular',
    grammaticalCase: 'accusative',
    grammaticalNumber: 'singular',
    grammaticalPerson: null,
    tense: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: DEMO_FORM_STAR_ID,
    lemmaId: DEMO_LEMMA_STAR_ID,
    surfaceForm: 'звёздная',
    morphologySummary: 'nominative, singular, feminine adjective',
    grammaticalCase: 'nominative',
    grammaticalNumber: 'singular',
    grammaticalPerson: null,
    tense: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: DEMO_FORM_SINGING_ID,
    lemmaId: DEMO_LEMMA_SING_ID,
    surfaceForm: 'поёт',
    morphologySummary: 'present, 3rd person singular',
    grammaticalCase: null,
    grammaticalNumber: 'singular',
    grammaticalPerson: '3',
    tense: 'present',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const demoTokenOccurrences: TokenOccurrence[] = [
  {
    id: '00000000-0000-0000-0000-000000000050',
    sourceLineId: LINE_1_ID,
    lexicalFormId: DEMO_FORM_STAR_ID,
    ordinal: 0,
    surfaceToken: 'Звёздная',
    charStart: 0,
    charEnd: 8,
    createdAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000051',
    sourceLineId: LINE_3_ID,
    lexicalFormId: DEMO_FORM_RIVER_ID,
    ordinal: 1,
    surfaceToken: 'реку',
    charStart: 4,
    charEnd: 8,
    createdAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000052',
    sourceLineId: LINE_2_ID,
    lexicalFormId: DEMO_FORM_SINGING_ID,
    ordinal: 1,
    surfaceToken: 'поёт',
    charStart: 5,
    charEnd: 9,
    createdAt: NOW,
  },
];

export const demoAnalysisFixture = {
  source: demoSource,
  sections: demoSections,
  lines: demoLines,
  lemmas: demoLemmas,
  forms: demoForms,
  tokens: demoTokenOccurrences,
};
