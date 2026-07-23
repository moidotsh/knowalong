// utils/supabase/repositories/studyCardRepository.ts
// Repository for study_cards. Owner-only via direct user_id. Flexible
// target FKs encode provenance (source-derived vs generated-transfer).

import type { StudyCard } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface StudyCardRow {
  id: string;
  user_id: string;
  card_kind: string;
  generated_content: boolean;
  source_id: string | null;
  source_section_id: string | null;
  source_line_id: string | null;
  lexical_lemma_id: string | null;
  target_core_concept_id: string | null;
  target_realization_id: string | null;
  prompt: string;
  answer: string;
  context_note: string | null;
  source_segment_id?: string | null;
  grammar_pattern_id?: string | null;
  difficulty_budget?: unknown;
  provenance?: string | null;
  source_run_id?: string | null;
  created_at: string;
  updated_at: string;
}

function toStudyCard(row: StudyCardRow): StudyCard {
  return {
    id: row.id,
    userId: row.user_id,
    cardKind: row.card_kind as StudyCard['cardKind'],
    generatedContent: row.generated_content,
    sourceId: row.source_id,
    sourceSectionId: row.source_section_id,
    sourceLineId: row.source_line_id,
    lexicalLemmaId: row.lexical_lemma_id,
    targetCoreConceptId: row.target_core_concept_id,
    targetRealizationId: row.target_realization_id,
    prompt: row.prompt,
    answer: row.answer,
    contextNote: row.context_note,
    sourceSegmentId: row.source_segment_id ?? null,
    grammarPatternId: row.grammar_pattern_id ?? null,
    difficultyBudget: (row.difficulty_budget as StudyCard['difficultyBudget']) ?? null,
    provenance: (row.provenance as StudyCard['provenance']) ?? null,
    sourceRunId: row.source_run_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All cards for a source (both source-derived and generated-transfer). */
async function findBySource(sourceId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
  if (DEMO_MODE) return demoAdapter.studyCard.findBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data, error } = await supabase
      .from('study_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as StudyCardRow[]).map(toStudyCard));
  } catch (e) {
    return handleRepositoryError('studyCard.findBySource', e);
  }
}

/** Cards for a specific section of a source. */
async function findBySection(sourceId: string, sectionId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
  if (DEMO_MODE) return demoAdapter.studyCard.findBySection(sourceId, sectionId, userId);
  if (!sourceId || !sectionId || !userId) return unauthorized('Missing source/section/user id');
  try {
    const { data, error } = await supabase
      .from('study_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .eq('source_section_id', sectionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as StudyCardRow[]).map(toStudyCard));
  } catch (e) {
    return handleRepositoryError('studyCard.findBySection', e);
  }
}

/** Due queue (cards with review_states.due_at <= now, or status = 'new'/'learning'). */
async function findDueQueue(userId: string, limit: number = 20): Promise<RepositoryResult<StudyCard[]>> {
  if (DEMO_MODE) return demoAdapter.studyCard.findDueQueue(userId, limit);
  if (!userId) return unauthorized('Missing user id');
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('study_cards')
      .select('*, state:review_states(*)')
      .eq('user_id', userId)
      .or(`state.due_at.lte.${nowIso},state.card_status.in.(new,learning)`)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return ok((data as unknown as StudyCardRow[]).map(toStudyCard));
  } catch (e) {
    return handleRepositoryError('studyCard.findDueQueue', e);
  }
}

/** Generated-transfer cards for a source (for the Study tab's generated section). */
async function findGeneratedTransferBySource(sourceId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
  if (DEMO_MODE) return demoAdapter.studyCard.findGeneratedTransferBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data, error } = await supabase
      .from('study_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .eq('generated_content', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as StudyCardRow[]).map(toStudyCard));
  } catch (e) {
    return handleRepositoryError('studyCard.findGeneratedTransferBySource', e);
  }
}

/** Create a new card. Used by proposalReviewService to promote accepted card proposals. */
async function create(
  userId: string,
  input: Omit<StudyCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<RepositoryResult<StudyCard>> {
  if (DEMO_MODE) return demoAdapter.studyCard.create(userId, input);
  if (!userId) return unauthorized('Missing user id');
  try {
    const insert: Record<string, unknown> = {
      user_id: userId,
      card_kind: input.cardKind,
      generated_content: input.generatedContent,
      source_id: input.sourceId,
      source_section_id: input.sourceSectionId,
      source_line_id: input.sourceLineId,
      lexical_lemma_id: input.lexicalLemmaId,
      target_core_concept_id: input.targetCoreConceptId,
      target_realization_id: input.targetRealizationId,
      prompt: input.prompt,
      answer: input.answer,
      context_note: input.contextNote,
    };
    if (input.sourceSegmentId !== undefined) insert.source_segment_id = input.sourceSegmentId;
    if (input.grammarPatternId !== undefined) insert.grammar_pattern_id = input.grammarPatternId;
    if (input.difficultyBudget !== undefined) insert.difficulty_budget = input.difficultyBudget;
    if (input.provenance !== undefined) insert.provenance = input.provenance;
    if (input.sourceRunId !== undefined) insert.source_run_id = input.sourceRunId;
    const { data, error } = await supabase
      .from('study_cards')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toStudyCard(data as StudyCardRow));
  } catch (e) {
    return handleRepositoryError('studyCard.create', e);
  }
}

export const studyCardRepository = {
  findBySource,
  findBySection,
  findDueQueue,
  findGeneratedTransferBySource,
  create,
};

export { toStudyCard, type StudyCardRow };
