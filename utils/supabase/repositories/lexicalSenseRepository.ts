// utils/supabase/repositories/lexicalSenseRepository.ts
// Repository for lexical_senses (destination for sense proposals).

import type {
  LexicalSense,
  SenseKind,
  EvidenceProvenance,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface LexicalSenseRow {
  id: string;
  user_id: string;
  lemma_id: string;
  sense_kind: string;
  gloss: string;
  definition_target_language: string;
  example_text: string | null;
  confidence: number | null;
  evidence_provenance: string;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

function toLexicalSense(row: LexicalSenseRow): LexicalSense {
  return {
    id: row.id,
    userId: row.user_id,
    lemmaId: row.lemma_id,
    senseKind: row.sense_kind as SenseKind,
    gloss: row.gloss,
    definitionTargetLanguage: row.definition_target_language,
    exampleText: row.example_text,
    confidence: row.confidence,
    evidenceProvenance: row.evidence_provenance as EvidenceProvenance,
    sourceRunId: row.source_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateLexicalSenseInput {
  userId: string;
  lemmaId: string;
  senseKind: SenseKind;
  gloss: string;
  definitionTargetLanguage?: string;
  exampleText?: string | null;
  confidence?: number | null;
  evidenceProvenance?: EvidenceProvenance;
  sourceRunId?: string | null;
}

async function findByLemma(lemmaId: string, userId: string): Promise<RepositoryResult<LexicalSense[]>> {
  if (DEMO_MODE) return demoAdapter.lexicalSense.findByLemma(lemmaId, userId);
  if (!lemmaId || !userId) return unauthorized('Missing lemma id or user id');
  try {
    const { data, error } = await supabase
      .from('lexical_senses')
      .select('*')
      .eq('user_id', userId)
      .eq('lemma_id', lemmaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok((data as LexicalSenseRow[]).map(toLexicalSense));
  } catch (e) {
    return handleRepositoryError('lexicalSense.findByLemma', e);
  }
}

async function create(input: CreateLexicalSenseInput): Promise<RepositoryResult<LexicalSense>> {
  if (DEMO_MODE) return demoAdapter.lexicalSense.create(input);
  if (!input.userId || !input.lemmaId) return unauthorized('Missing user id or lemma id');
  try {
    const { data, error } = await supabase
      .from('lexical_senses')
      .insert({
        user_id: input.userId,
        lemma_id: input.lemmaId,
        sense_kind: input.senseKind,
        gloss: input.gloss,
        definition_target_language: input.definitionTargetLanguage ?? 'en',
        example_text: input.exampleText ?? null,
        confidence: input.confidence ?? null,
        evidence_provenance: input.evidenceProvenance ?? 'generated_analysis',
        source_run_id: input.sourceRunId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toLexicalSense(data as LexicalSenseRow));
  } catch (e) {
    return handleRepositoryError('lexicalSense.create', e);
  }
}

async function delete_(id: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.lexicalSense.delete(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { error } = await supabase
      .from('lexical_senses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('lexicalSense.delete', e);
  }
}

export const lexicalSenseRepository = {
  findByLemma,
  create,
  delete: delete_,
};

export { toLexicalSense, type LexicalSenseRow };
