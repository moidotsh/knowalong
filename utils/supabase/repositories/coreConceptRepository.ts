// utils/supabase/repositories/coreConceptRepository.ts
// Repository for the Core Concept framework (core_concepts,
// concept_realizations, learner_concept_progress). core_concepts is
// authenticated read-only; realizations split global/owner; progress is
// owner-only.

import type {
  CoreConcept,
  ConceptRealization,
  LearnerConceptProgress,
  RealizationType,
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
  grammar_json: unknown | null;
  examples_json: unknown | null;
  /** Migration 0011 (Studio Phase E1 + Phase 2). Older rows: null. */
  ipa: string | null;
  frequency_rank: number | null;
  transliteration: string | null;
  prerequisites: unknown | null;
  enables: unknown | null;
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
    grammarJson: (row.grammar_json ?? null) as ConceptRealization['grammarJson'],
    examplesJson: (row.examples_json ?? null) as ConceptRealization['examplesJson'],
    ipa: row.ipa ?? null,
    frequencyRank: row.frequency_rank ?? null,
    transliteration: row.transliteration ?? null,
    // Defensive array coercion: jsonb column, older rows carry null.
    prerequisites: Array.isArray(row.prerequisites) ? (row.prerequisites as string[]) : [],
    enables: Array.isArray(row.enables) ? (row.enables as string[]) : [],
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

/**
 * Every curated-global (user_id IS NULL) realization for a language —
 * the Studio-published pack. The Supabase SpineProvider consumes this
 * to build conceptSteps(); demo mode returns [] (the mock spine serves
 * fixtures instead). No user filter: published rows are world-readable
 * per the base RLS policy.
 */
async function findPublishedByLanguage(languageCode: string): Promise<RepositoryResult<ConceptRealization[]>> {
  if (DEMO_MODE) return ok([]);
  if (!languageCode) return unauthorized('Missing language code');
  try {
    const { data, error } = await supabase
      .from('concept_realizations')
      .select('*')
      .eq('language_code', languageCode)
      .is('user_id', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as ConceptRealizationRow[]).map(toConceptRealization));
  } catch (e) {
    return handleRepositoryError('coreConcept.findPublishedByLanguage', e);
  }
}

/** Input for {@link createUserRealization}. Mirrors the analysis-run
 * realization proposal payload; only the columns the learner path owns
 * are writable (global published rows are Studio's). `sourceRunId` is
 * provenance metadata — recorded by the caller in the proposal's
 * acceptance trail, not a column on this table (M11 keeps run linkage
 * on the proposal side). */
export interface CreateUserRealizationInput {
  coreConceptId: string;
  userId: string;
  languageCode: string;
  realizationType: RealizationType;
  surfaceForm: string;
  gloss: string | null;
  grammaticalNote: string | null;
  lemmaId: string | null;
  sourceRunId?: string | null;
}

/**
 * Promote an accepted realization proposal into a user-owned
 * `concept_realizations` row (CLCC promotion — the M8 deferral is
 * lifted for the PWA-side user-owned path; global published rows
 * remain Studio's exclusive write target). Returns the new row id so
 * `study_cards.target_realization_id` can point at it.
 */
async function createUserRealization(input: CreateUserRealizationInput): Promise<RepositoryResult<string>> {
  if (DEMO_MODE) {
    // Demo has no seeded realization rows; mint a stable pseudo-id so
    // the caller's FK wiring is exercisable without Supabase.
    return ok(`demo-realization-${input.coreConceptId}-${input.languageCode}`);
  }
  if (!input.coreConceptId || !input.userId || !input.languageCode) {
    return unauthorized('Missing concept id, user id, or language code');
  }
  try {
    const { data, error } = await supabase
      .from('concept_realizations')
      .insert({
        core_concept_id: input.coreConceptId,
        user_id: input.userId,
        language_code: input.languageCode,
        realization_type: input.realizationType,
        surface_form: input.surfaceForm,
        gloss: input.gloss,
        grammatical_note: input.grammaticalNote,
        lemma_id: input.lemmaId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return ok((data as { id: string }).id);
  } catch (e) {
    return handleRepositoryError('coreConcept.createUserRealization', e);
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
  findPublishedByLanguage,
  createUserRealization,
  findLearnerProgress,
  findByCode,
};

export { toCoreConcept, toConceptRealization, toLearnerConceptProgress, type CoreConceptRow, type ConceptRealizationRow, type LearnerConceptProgressRow };
