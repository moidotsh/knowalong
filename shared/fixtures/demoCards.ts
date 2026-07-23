// shared/fixtures/demoCards.ts
// Demo study cards + review states for the demo adapter. 6 source-derived
// cards (clearly labelled) and 2 generated-transfer cards (clearly labelled
// as generated practice). The Russian prompts/answers reuse the original
// fixture source lines from demoSources.ts — no copyrighted content.

import type { StudyCard, ReviewState } from '../types/knowalong';
import {
  DEMO_SOURCE_ID,
  DEMO_USER_ID,
} from './demoSources';

const NOW = '2026-07-22T00:00:00.000Z';
const TOMORROW = '2026-07-23T00:00:00.000Z';
const YESTERDAY = '2026-07-21T00:00:00.000Z';

const LINE_1_ID = '00000000-0000-0000-0000-000000000040';
const LINE_2_ID = '00000000-0000-0000-0000-000000000041';
const LINE_3_ID = '00000000-0000-0000-0000-000000000042';
const LINE_4_ID = '00000000-0000-0000-0000-000000000043';
const LINE_5_ID = '00000000-0000-0000-0000-000000000044';
const LINE_6_ID = '00000000-0000-0000-0000-000000000045';

const SECTION_CHORUS_ID = '00000000-0000-0000-0000-000000000031';

const LEMMA_RIVER_ID = '00000000-0000-0000-0000-000000000010';
const LEMMA_SING_ID = '00000000-0000-0000-0000-000000000012';

const CONCEPT_MOTION_ID = '00000000-0000-0000-0000-000000000099';

export const demoCards: StudyCard[] = [
  // ── Source-derived cards (generatedContent = false) ──────────────────
  {
    id: '00000000-0000-0000-0000-000000000060',
    userId: DEMO_USER_ID,
    cardKind: 'source_recognition',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_1_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Звёздная река течёт тихо.',
    answer: 'The starry river flows quietly.',
    contextNote: 'Line 1, Куплет 1.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000061',
    userId: DEMO_USER_ID,
    cardKind: 'source_recognition',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_2_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Свет поёт над водой.',
    answer: 'Light sings above the water.',
    contextNote: 'Line 2, Куплет 1.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000062',
    userId: DEMO_USER_ID,
    cardKind: 'source_production',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_3_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Oh, river, carry me home.',
    answer: 'О, река, неси меня домой.',
    contextNote: 'Line 3, Припев.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000063',
    userId: DEMO_USER_ID,
    cardKind: 'source_cloze',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_4_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Где ___ знают мой путь.',
    answer: 'звёзды',
    contextNote: 'Line 4, Припев. Cloze on "звёзды" (stars).',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000064',
    userId: DEMO_USER_ID,
    cardKind: 'source_recognition',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_5_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Тихий свет ведёт меня.',
    answer: 'The quiet light leads me.',
    contextNote: 'Line 5, Куплет 2.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000065',
    userId: DEMO_USER_ID,
    cardKind: 'source_recognition',
    generatedContent: false,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: LINE_6_ID,
    lexicalLemmaId: null,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'И река поёт со мной.',
    answer: 'And the river sings with me.',
    contextNote: 'Line 6, Куплет 2.',
    createdAt: NOW,
    updatedAt: NOW,
  },

  // ── Generated-transfer cards (generatedContent = true) ───────────────
  // Generated practice that targets a concept/lemma. Visibly labelled as
  // "Generated practice" — never presented as source text.
  {
    id: '00000000-0000-0000-0000-000000000070',
    userId: DEMO_USER_ID,
    cardKind: 'generated_transfer',
    generatedContent: true,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: SECTION_CHORUS_ID,
    sourceLineId: null,
    lexicalLemmaId: LEMMA_RIVER_ID,
    targetCoreConceptId: CONCEPT_MOTION_ID,
    targetRealizationId: null,
    prompt: 'How would you say "the river carries" using the accusative form of "река"?',
    answer: 'реку — "река (accusative)" — used as the direct object of "неси" (carry).',
    contextNote: 'Generated practice. Targets the MOTION concept via the river lemma observed in the Припев.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-000000000071',
    userId: DEMO_USER_ID,
    cardKind: 'generated_transfer',
    generatedContent: true,
    sourceId: DEMO_SOURCE_ID,
    sourceSectionId: null,
    sourceLineId: null,
    lexicalLemmaId: LEMMA_SING_ID,
    targetCoreConceptId: null,
    targetRealizationId: null,
    prompt: 'Conjugate "петь" (to sing) in the 3rd person singular present.',
    answer: 'поёт — "he/she/it sings." Imperfective aspect.',
    contextNote: 'Generated practice. Targets the "петь" lemma observed in lines 2 and 6.',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const demoReviewStates: ReviewState[] = [
  {
    cardId: '00000000-0000-0000-0000-000000000060',
    cardStatus: 'review',
    dueAt: TOMORROW,
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 2,
    lapses: 0,
    lastReviewedAt: NOW,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000061',
    cardStatus: 'learning',
    dueAt: NOW,
    intervalDays: 0,
    easeFactor: 2.3,
    repetitions: 1,
    lapses: 0,
    lastReviewedAt: YESTERDAY,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000062',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000063',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000064',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000065',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000070',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
  {
    cardId: '00000000-0000-0000-0000-000000000071',
    cardStatus: 'new',
    dueAt: null,
    intervalDays: null,
    easeFactor: null,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    updatedAt: NOW,
  },
];
