// utils/supabase/repositories/coreConceptRepository.ts
// Repository for the Core Concept framework (core_concepts,
// concept_realizations, learner_concept_progress). core_concepts is
// authenticated read-only; realizations split global/owner; progress is
// owner-only.

import type {
  CoreConcept,
  ConceptRealization,
  LearnerConceptProgress,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface CoreConceptRow {
  id: string;
  code: string;
  canonical_label: string;
  description: string | null;
  functional_cluster: string;
  tier: number;
  created_at: string;
}

interface ConceptRealizationRow {
  id: string;
  core_concept_id: string;
  user_id: string | null;
  language_code: string;
  realization_type: string;
  surface_form: string;
  gloss: string | null;
  grammatical_note: string | null;
  lemma_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LearnerConceptProgressRow {
  id: string;
  user_id: string;
  core_concept_id: string;
  language_code: string;
  knowledge_level: string;
  evidence_count: number;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

function toCoreConcept(row: CoreConceptRow): CoreConcept {
  return {
    id: row.id,
    code: row.code,
    canonicalLabel: row.canonical_label,
    description: row.description,
    functionalCluster: row.functional_cluster,
    tier: row.tier as CoreConcept['tier'],
    createdAt: row.created_at,
  };
}

function toConceptRealization(row: ConceptRealizationRow): ConceptRealization {
  return {
    id: row.id,
    coreConceptId: row.core_concept_id,
    userId: row.user_id,
    languageCode: row.language_code,
    realizationType: row.realization_type as ConceptRealization['realizationType'],
    surfaceForm: row.surface_form,
    gloss: row.gloss,
    grammaticalNote: row.grammatical_note,
    lemmaId: row.lemma_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLearnerConceptProgress(row: LearnerConceptProgressRow): LearnerConceptProgress {
  return {
    id: row.id,
    userId: row.user_id,
    coreConceptId: row.core_concept_id,
    languageCode: row.language_code,
    knowledgeLevel: row.knowledge_level as LearnerConceptProgress['knowledgeLevel'],
    evidenceCount: row.evidence_count,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All seeded core concepts (authenticated read-only). Ordered by tier then code. */
async function findAll(userId: string): Promise<RepositoryResult<CoreConcept[]>> {
  if (DEMO_MODE) return demoAdapter.coreConcept.findAll(userId);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('core_concepts')
      .select('*')
      .order('tier', { ascending: true })
      .order('code', { ascending: true });
    if (error) throw error;
    return ok((data as CoreConceptRow[]).map(toCoreConcept));
  } catch (e) {
    return handleRepositoryError('coreConcept.findAll', e);
  }
}

/** Realizations for a concept in a language (curated global + caller's own). */
async function findRealizations(conceptId: string, languageCode: string, userId: string): Promise<RepositoryResult<ConceptRealization[]>> {
  if (DEMO_MODE) return demoAdapter.coreConcept.findRealizations(conceptId, languageCode, userId);
  if (!conceptId || !userId) return unauthorized('Missing concept id or user id');
  try {
    const { data, error } = await supabase
      .from('concept_realizations')
      .select('*')
      .eq('core_concept_id', conceptId)
      .eq('language_code', languageCode)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as ConceptRealizationRow[]).map(toConceptRealization));
  } catch (e) {
    return handleRepositoryError('coreConcept.findRealizations', e);
  }
}

/** Learner progress for all concepts in a language (owner-only). */
async function findLearnerProgress(userId: string, languageCode: string): Promise<RepositoryResult<LearnerConceptProgress[]>> {
  if (DEMO_MODE) return demoAdapter.coreConcept.findLearnerProgress(userId, languageCode);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('learner_concept_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('language_code', languageCode)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ok((data as LearnerConceptProgressRow[]).map(toLearnerConceptProgress));
  } catch (e) {
    return handleRepositoryError('coreConcept.findLearnerProgress', e);
  }
}

/**
 * Find a Core Concept's id by its code (FIRST_PERSON, EXIST, …). Core
 * Concepts are seeded and read-only; this returns the id so callers can
 * populate target FKs without creating new concepts. Returns undefined
 * when the code is not in the catalog — proposalReviewService surfaces
 * that as a `blocked` outcome.
 */
async function findByCode(code: string): Promise<string | undefined> {
  if (!code) return undefined;
  try {
    const { data, error } = await supabase
      .from('core_concepts')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data ? (data as { id: string }).id : undefined;
  } catch (e) {
    handleRepositoryError('coreConcept.findByCode', e);
    return undefined;
  }
}

export const coreConceptRepository = {
  findAll,
  findRealizations,
  findLearnerProgress,
  findByCode,
};

export { toCoreConcept, toConceptRealization, toLearnerConceptProgress, type CoreConceptRow, type ConceptRealizationRow, type LearnerConceptProgressRow };
