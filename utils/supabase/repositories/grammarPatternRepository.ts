// utils/supabase/repositories/grammarPatternRepository.ts
// Repository for grammar_patterns. A generated_transfer card may target
// a grammar_pattern (migration 009 STEP C).

import type {
  GrammarPattern,
  EvidenceProvenance,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface GrammarPatternRow {
  id: string;
  user_id: string;
  source_id: string | null;
  source_section_id: string | null;
  source_segment_id: string | null;
  target_core_concept_id: string | null;
  target_lemma_id: string | null;
  pattern_code: string;
  pattern_label: string;
  explanation: string | null;
  example_source_text: string | null;
  example_target_text: string | null;
  confidence: number | null;
  evidence_provenance: string;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

function toGrammarPattern(row: GrammarPatternRow): GrammarPattern {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    sourceSectionId: row.source_section_id,
    sourceSegmentId: row.source_segment_id,
    targetCoreConceptId: row.target_core_concept_id,
    targetLemmaId: row.target_lemma_id,
    patternCode: row.pattern_code,
    patternLabel: row.pattern_label,
    explanation: row.explanation,
    exampleSourceText: row.example_source_text,
    exampleTargetText: row.example_target_text,
    confidence: row.confidence,
    evidenceProvenance: row.evidence_provenance as EvidenceProvenance,
    sourceRunId: row.source_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateGrammarPatternInput {
  userId: string;
  sourceId?: string | null;
  sourceSectionId?: string | null;
  sourceSegmentId?: string | null;
  targetCoreConceptId?: string | null;
  targetLemmaId?: string | null;
  patternCode: string;
  patternLabel: string;
  explanation?: string | null;
  exampleSourceText?: string | null;
  exampleTargetText?: string | null;
  confidence?: number | null;
  evidenceProvenance?: EvidenceProvenance;
  sourceRunId?: string | null;
}

async function findBySource(sourceId: string, userId: string): Promise<RepositoryResult<GrammarPattern[]>> {
  if (DEMO_MODE) return demoAdapter.grammarPattern.findBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data, error } = await supabase
      .from('grammar_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as GrammarPatternRow[]).map(toGrammarPattern));
  } catch (e) {
    return handleRepositoryError('grammarPattern.findBySource', e);
  }
}

async function create(input: CreateGrammarPatternInput): Promise<RepositoryResult<GrammarPattern>> {
  if (DEMO_MODE) return demoAdapter.grammarPattern.create(input);
  if (!input.userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('grammar_patterns')
      .insert({
        user_id: input.userId,
        source_id: input.sourceId ?? null,
        source_section_id: input.sourceSectionId ?? null,
        source_segment_id: input.sourceSegmentId ?? null,
        target_core_concept_id: input.targetCoreConceptId ?? null,
        target_lemma_id: input.targetLemmaId ?? null,
        pattern_code: input.patternCode,
        pattern_label: input.patternLabel,
        explanation: input.explanation ?? null,
        example_source_text: input.exampleSourceText ?? null,
        example_target_text: input.exampleTargetText ?? null,
        confidence: input.confidence ?? null,
        evidence_provenance: input.evidenceProvenance ?? 'generated_analysis',
        source_run_id: input.sourceRunId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toGrammarPattern(data as GrammarPatternRow));
  } catch (e) {
    return handleRepositoryError('grammarPattern.create', e);
  }
}

async function delete_(id: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.grammarPattern.delete(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { error } = await supabase
      .from('grammar_patterns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('grammarPattern.delete', e);
  }
}

export const grammarPatternRepository = {
  findBySource,
  create,
  delete: delete_,
};

export { toGrammarPattern, type GrammarPatternRow };
