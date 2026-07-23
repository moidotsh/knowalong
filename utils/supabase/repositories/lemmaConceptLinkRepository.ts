// utils/supabase/repositories/lemmaConceptLinkRepository.ts
// Repository for lemma_concept_links (destination for concept_mapping proposals).

import type {
  LemmaConceptLink,
  EvidenceProvenance,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface LemmaConceptLinkRow {
  id: string;
  user_id: string;
  lemma_id: string;
  core_concept_id: string;
  realization_note: string | null;
  confidence: number | null;
  evidence_provenance: string;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

function toLemmaConceptLink(row: LemmaConceptLinkRow): LemmaConceptLink {
  return {
    id: row.id,
    userId: row.user_id,
    lemmaId: row.lemma_id,
    coreConceptId: row.core_concept_id,
    realizationNote: row.realization_note,
    confidence: row.confidence,
    evidenceProvenance: row.evidence_provenance as EvidenceProvenance,
    sourceRunId: row.source_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UpsertLemmaConceptLinkInput {
  userId: string;
  lemmaId: string;
  coreConceptId: string;
  realizationNote?: string | null;
  confidence?: number | null;
  evidenceProvenance?: EvidenceProvenance;
  sourceRunId?: string | null;
}

async function findByLemma(lemmaId: string, userId: string): Promise<RepositoryResult<LemmaConceptLink[]>> {
  if (DEMO_MODE) return demoAdapter.lemmaConceptLink.findByLemma(lemmaId, userId);
  if (!lemmaId || !userId) return unauthorized('Missing lemma id or user id');
  try {
    const { data, error } = await supabase
      .from('lemma_concept_links')
      .select('*')
      .eq('user_id', userId)
      .eq('lemma_id', lemmaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as LemmaConceptLinkRow[]).map(toLemmaConceptLink));
  } catch (e) {
    return handleRepositoryError('lemmaConceptLink.findByLemma', e);
  }
}

async function upsert(input: UpsertLemmaConceptLinkInput): Promise<RepositoryResult<LemmaConceptLink>> {
  if (DEMO_MODE) return demoAdapter.lemmaConceptLink.upsert(input);
  if (!input.userId || !input.lemmaId || !input.coreConceptId) {
    return unauthorized('Missing user id, lemma id, or core concept id');
  }
  try {
    // Check for existing (lemmaId, coreConceptId) — unique constraint.
    const { data: existing, error: findErr } = await supabase
      .from('lemma_concept_links')
      .select('*')
      .eq('user_id', input.userId)
      .eq('lemma_id', input.lemmaId)
      .eq('core_concept_id', input.coreConceptId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) {
      const { data, error } = await supabase
        .from('lemma_concept_links')
        .update({
          realization_note: input.realizationNote ?? null,
          confidence: input.confidence ?? null,
          evidence_provenance: input.evidenceProvenance ?? 'generated_analysis',
        })
        .eq('id', (existing as LemmaConceptLinkRow).id)
        .select('*')
        .single();
      if (error) throw error;
      return ok(toLemmaConceptLink(data as LemmaConceptLinkRow));
    }
    const { data, error } = await supabase
      .from('lemma_concept_links')
      .insert({
        user_id: input.userId,
        lemma_id: input.lemmaId,
        core_concept_id: input.coreConceptId,
        realization_note: input.realizationNote ?? null,
        confidence: input.confidence ?? null,
        evidence_provenance: input.evidenceProvenance ?? 'generated_analysis',
        source_run_id: input.sourceRunId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toLemmaConceptLink(data as LemmaConceptLinkRow));
  } catch (e) {
    return handleRepositoryError('lemmaConceptLink.upsert', e);
  }
}

async function delete_(id: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.lemmaConceptLink.delete(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { error } = await supabase
      .from('lemma_concept_links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('lemmaConceptLink.delete', e);
  }
}

export const lemmaConceptLinkRepository = {
  findByLemma,
  upsert,
  delete: delete_,
};

export { toLemmaConceptLink, type LemmaConceptLinkRow };
