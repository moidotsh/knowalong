// shared/fixtures/demoConcepts.ts
// Demo learner concept progress for the demo adapter. Progress for ~5
// concepts across the seeded Core 0–2 catalog. The concept IDs are stable
// placeholders (real IDs are assigned at seed time by the migration).

import type { LearnerConceptProgress, CoreConcept } from '../types/knowalong';
import { DEMO_USER_ID } from './demoSources';

const NOW = '2026-07-22T00:00:00.000Z';

/**
 * Seed concept IDs. These are stable placeholders used by the demo adapter.
 * The real IDs come from the migration seed (matched by code, not by id).
 * The demo adapter resolves the real id by code at lookup time.
 */
export const DEMO_CONCEPT_IDS_BY_CODE: Record<string, string> = {
  FIRST_PERSON: '00000000-0000-0000-0000-000000000090',
  MOTION: '00000000-0000-0000-0000-000000000091',
  PERCEPTION: '00000000-0000-0000-0000-000000000092',
  EXIST: '00000000-0000-0000-0000-000000000093',
  NEGATION: '00000000-0000-0000-0000-000000000094',
};

/**
 * Demo core concepts (a subset of the seeded catalog). The demo adapter
 * returns these so the UI can render concept labels without a Supabase
 * round-trip. The real seeded rows live in the migration.
 */
export const demoCoreConcepts: CoreConcept[] = [
  {
    id: DEMO_CONCEPT_IDS_BY_CODE.FIRST_PERSON,
    code: 'FIRST_PERSON',
    canonicalLabel: 'First person',
    description: 'Reference to the speaker/writer.',
    functionalCluster: 'pronoun',
    tier: 0,
    createdAt: NOW,
  },
  {
    id: DEMO_CONCEPT_IDS_BY_CODE.MOTION,
    code: 'MOVE_TO',
    canonicalLabel: 'Move to / into',
    description: 'Movement with a destination.',
    functionalCluster: 'motion',
    tier: 1,
    createdAt: NOW,
  },
  {
    id: DEMO_CONCEPT_IDS_BY_CODE.PERCEPTION,
    code: 'SEE',
    canonicalLabel: 'See / watch',
    description: 'Visual perception.',
    functionalCluster: 'perception',
    tier: 1,
    createdAt: NOW,
  },
  {
    id: DEMO_CONCEPT_IDS_BY_CODE.EXIST,
    code: 'EXIST',
    canonicalLabel: 'Existence / being',
    description: 'Affirming that something exists or is the case.',
    functionalCluster: 'existence',
    tier: 0,
    createdAt: NOW,
  },
  {
    id: DEMO_CONCEPT_IDS_BY_CODE.NEGATION,
    code: 'NEGATION',
    canonicalLabel: 'Negation',
    description: 'Denial or absence of something.',
    functionalCluster: 'negation',
    tier: 0,
    createdAt: NOW,
  },
];

/**
 * Demo learner progress. ~5 concepts at various evidence levels. The
 * concept_id fields match DEMO_CONCEPT_IDS_BY_CODE so the demo adapter
 * joins cleanly.
 */
export const demoConceptProgress: LearnerConceptProgress[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a0',
    userId: DEMO_USER_ID,
    coreConceptId: DEMO_CONCEPT_IDS_BY_CODE.FIRST_PERSON,
    languageCode: 'ru',
    knowledgeLevel: 'retrievable',
    evidenceCount: 6,
    lastSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    userId: DEMO_USER_ID,
    coreConceptId: DEMO_CONCEPT_IDS_BY_CODE.MOTION,
    languageCode: 'ru',
    knowledgeLevel: 'recognized',
    evidenceCount: 3,
    lastSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    userId: DEMO_USER_ID,
    coreConceptId: DEMO_CONCEPT_IDS_BY_CODE.PERCEPTION,
    languageCode: 'ru',
    knowledgeLevel: 'encountered',
    evidenceCount: 1,
    lastSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    userId: DEMO_USER_ID,
    coreConceptId: DEMO_CONCEPT_IDS_BY_CODE.EXIST,
    languageCode: 'ru',
    knowledgeLevel: 'encountered',
    evidenceCount: 1,
    lastSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a4',
    userId: DEMO_USER_ID,
    coreConceptId: DEMO_CONCEPT_IDS_BY_CODE.NEGATION,
    languageCode: 'ru',
    knowledgeLevel: 'encountered',
    evidenceCount: 0,
    lastSeenAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
