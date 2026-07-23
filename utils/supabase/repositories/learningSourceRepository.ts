// utils/supabase/repositories/learningSourceRepository.ts
// Repository for learning_sources. Owner-only via direct user_id. Every
// method returns RepositoryResult<T>; services convert to thrown AppError
// via throwIfFailed. In demo mode, methods delegate to the demo adapter.

import type { LearningSource, CreateLyricDraftDTO, UpdateLearningSourceDTO } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, validateWithSchema, unauthorized } from './types';
import { LyricDraftSchema, UpdateLearningSourceSchema } from '../../../shared/types/knowalong';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

/** Raw DB row shape (snake_case). Private to this repository. */
interface LearningSourceRow {
  id: string;
  user_id: string;
  source_type: string;
  title: string;
  artist: string | null;
  target_language: string;
  translation_language: string;
  notes: string | null;
  source_content_hash: string | null;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

function toLearningSource(row: LearningSourceRow): LearningSource {
  return {
    id: row.id,
    userId: row.user_id,
    sourceType: row.source_type as LearningSource['sourceType'],
    title: row.title,
    artist: row.artist,
    targetLanguage: row.target_language,
    translationLanguage: row.translation_language,
    notes: row.notes,
    sourceContentHash: row.source_content_hash,
    processingStatus: row.processing_status as LearningSource['processingStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findAll(userId: string): Promise<RepositoryResult<LearningSource[]>> {
  if (DEMO_MODE) return demoAdapter.learningSource.findAll(userId);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('learning_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok((data as LearningSourceRow[]).map(toLearningSource));
  } catch (e) {
    return handleRepositoryError('learningSource.findAll', e);
  }
}

async function findById(id: string, userId: string): Promise<RepositoryResult<LearningSource | null>> {
  if (DEMO_MODE) return demoAdapter.learningSource.findById(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('learning_sources')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? toLearningSource(data as LearningSourceRow) : null);
  } catch (e) {
    return handleRepositoryError('learningSource.findById', e);
  }
}

async function createDraft(userId: string, input: CreateLyricDraftDTO): Promise<RepositoryResult<LearningSource>> {
  if (DEMO_MODE) return demoAdapter.learningSource.createDraft(userId, input);
  if (!userId) return unauthorized('Missing user id');
  const validated = validateWithSchema(LyricDraftSchema, input);
  if (!validated.success) return validated;
  try {
    const { data, error } = await supabase
      .from('learning_sources')
      .insert({
        user_id: userId,
        source_type: validated.data.sourceType,
        title: validated.data.title,
        artist: validated.data.artist,
        target_language: validated.data.targetLanguage,
        translation_language: validated.data.translationLanguage,
        notes: validated.data.notes,
        processing_status: 'draft',
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toLearningSource(data as LearningSourceRow));
  } catch (e) {
    return handleRepositoryError('learningSource.createDraft', e);
  }
}

async function update(id: string, userId: string, input: UpdateLearningSourceDTO): Promise<RepositoryResult<LearningSource>> {
  if (DEMO_MODE) return demoAdapter.learningSource.update(id, userId, input);
  if (!id || !userId) return unauthorized('Missing id or user id');
  const validated = validateWithSchema(UpdateLearningSourceSchema, input);
  if (!validated.success) return validated;
  try {
    const { data, error } = await supabase
      .from('learning_sources')
      .update(validated.data)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toLearningSource(data as LearningSourceRow));
  } catch (e) {
    return handleRepositoryError('learningSource.update', e);
  }
}

async function archive(id: string, userId: string): Promise<RepositoryResult<LearningSource>> {
  if (DEMO_MODE) return demoAdapter.learningSource.archive(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('learning_sources')
      .update({ processing_status: 'archived' })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toLearningSource(data as LearningSourceRow));
  } catch (e) {
    return handleRepositoryError('learningSource.archive', e);
  }
}

async function deleteSource(id: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.learningSource.deleteSource(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { error } = await supabase
      .from('learning_sources')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('learningSource.deleteSource', e);
  }
}

export const learningSourceRepository = {
  findAll,
  findById,
  createDraft,
  update,
  archive,
  deleteSource,
};

// Re-export the mapper for tests (D6: tests may import raw row types from
// the repository module, but UI may not).
export { toLearningSource, type LearningSourceRow };
