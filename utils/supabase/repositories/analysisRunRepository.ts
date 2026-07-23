// utils/supabase/repositories/analysisRunRepository.ts
// Repository for analysis_runs. PWA-owned writes; the companion NEVER
// writes to Supabase. Each run is a state machine ending in
// awaiting_review | failed | cancelled (NO succeeded).

import type {
  AnalysisRun,
  AnalysisRunType,
  AnalysisRunStatus,
  StartSourceAnalysisDTO,
  StartClccGenerationDTO,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface AnalysisRunRow {
  id: string;
  user_id: string;
  source_id: string | null;
  run_type: string;
  status: string;
  target_language_code: string;
  model_label: string | null;
  companion_version: string | null;
  companion_job_id: string | null;
  source_content_checksum: string | null;
  source_line_count: number | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  request_params: Record<string, unknown>;
  summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function toAnalysisRun(row: AnalysisRunRow): AnalysisRun {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    runType: row.run_type as AnalysisRunType,
    status: row.status as AnalysisRunStatus,
    targetLanguageCode: row.target_language_code,
    modelLabel: row.model_label,
    companionVersion: row.companion_version,
    companionJobId: row.companion_job_id,
    sourceContentChecksum: row.source_content_checksum,
    sourceLineCount: row.source_line_count,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failureReason: row.failure_reason,
    requestParams: row.request_params ?? {},
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateSourceAnalysisRunInput {
  userId: string;
  sourceId: string;
  targetLanguageCode: string;
  sourceContentChecksum: string;
  sourceLineCount: number;
  modelLabel?: string;
  requestParams?: Record<string, unknown>;
}

export interface CreateClccRunInput {
  userId: string;
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  modelLabel?: string;
  requestParams?: Record<string, unknown>;
}

async function createSourceAnalysisRun(
  input: CreateSourceAnalysisRunInput,
): Promise<RepositoryResult<AnalysisRun>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.createSourceAnalysisRun(input);
  if (!input.userId || !input.sourceId) return unauthorized('Missing user id or source id');
  try {
    const dto: StartSourceAnalysisDTO = { sourceId: input.sourceId, modelLabel: input.modelLabel };
    const { data, error } = await supabase
      .from('analysis_runs')
      .insert({
        user_id: input.userId,
        source_id: input.sourceId,
        run_type: 'source_analysis',
        status: 'queued',
        target_language_code: input.targetLanguageCode,
        model_label: input.modelLabel ?? null,
        source_content_checksum: input.sourceContentChecksum,
        source_line_count: input.sourceLineCount,
        request_params: { ...input.requestParams, dto },
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toAnalysisRun(data as AnalysisRunRow));
  } catch (e) {
    return handleRepositoryError('analysisRun.createSourceAnalysisRun', e);
  }
}

async function createClccRun(input: CreateClccRunInput): Promise<RepositoryResult<AnalysisRun>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.createClccRun(input);
  if (!input.userId) return unauthorized('Missing user id');
  try {
    const dto: StartClccGenerationDTO = {
      targetLanguageCode: input.targetLanguageCode,
      coreConceptCodes: input.coreConceptCodes,
      modelLabel: input.modelLabel,
    };
    const { data, error } = await supabase
      .from('analysis_runs')
      .insert({
        user_id: input.userId,
        source_id: null,
        run_type: 'clcc_generation',
        status: 'queued',
        target_language_code: input.targetLanguageCode,
        model_label: input.modelLabel ?? null,
        request_params: { ...input.requestParams, dto },
      })
      .select('*')
      .single();
    if (error) throw error;
    return ok(toAnalysisRun(data as AnalysisRunRow));
  } catch (e) {
    return handleRepositoryError('analysisRun.createClccRun', e);
  }
}

async function findById(id: string, userId: string): Promise<RepositoryResult<AnalysisRun | null>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.findById(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? toAnalysisRun(data as AnalysisRunRow) : null);
  } catch (e) {
    return handleRepositoryError('analysisRun.findById', e);
  }
}

async function updateStatus(
  id: string,
  userId: string,
  patch: {
    status: AnalysisRunStatus;
    startedAt?: string | null;
    completedAt?: string | null;
    failureReason?: string | null;
    summary?: Record<string, unknown> | null;
    companionVersion?: string | null;
    companionJobId?: string | null;
    modelLabel?: string | null;
  },
): Promise<RepositoryResult<AnalysisRun>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.updateStatus(id, userId, patch);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const update: Record<string, unknown> = { status: patch.status };
    if (patch.startedAt !== undefined) update.started_at = patch.startedAt;
    if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
    if (patch.failureReason !== undefined) update.failure_reason = patch.failureReason;
    if (patch.summary !== undefined) update.summary = patch.summary;
    if (patch.companionVersion !== undefined) update.companion_version = patch.companionVersion;
    if (patch.companionJobId !== undefined) update.companion_job_id = patch.companionJobId;
    if (patch.modelLabel !== undefined) update.model_label = patch.modelLabel;
    const { data, error } = await supabase
      .from('analysis_runs')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toAnalysisRun(data as AnalysisRunRow));
  } catch (e) {
    return handleRepositoryError('analysisRun.updateStatus', e);
  }
}

async function appendSummary(
  id: string,
  userId: string,
  summary: Record<string, unknown>,
): Promise<RepositoryResult<AnalysisRun>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.appendSummary(id, userId, summary);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .update({ summary })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toAnalysisRun(data as AnalysisRunRow));
  } catch (e) {
    return handleRepositoryError('analysisRun.appendSummary', e);
  }
}

async function listByUser(userId: string, limit: number = 50): Promise<RepositoryResult<AnalysisRun[]>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.listByUser(userId, limit);
  if (!userId) return unauthorized('Missing user id');
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ok((data as AnalysisRunRow[]).map(toAnalysisRun));
  } catch (e) {
    return handleRepositoryError('analysisRun.listByUser', e);
  }
}

async function listBySource(sourceId: string, userId: string): Promise<RepositoryResult<AnalysisRun[]>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.listBySource(sourceId, userId);
  if (!sourceId || !userId) return unauthorized('Missing source id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok((data as AnalysisRunRow[]).map(toAnalysisRun));
  } catch (e) {
    return handleRepositoryError('analysisRun.listBySource', e);
  }
}

async function listByLanguage(
  languageCode: string,
  userId: string,
  runType: AnalysisRunType = 'clcc_generation',
): Promise<RepositoryResult<AnalysisRun[]>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.listByLanguage(languageCode, userId, runType);
  if (!languageCode || !userId) return unauthorized('Missing language code or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('run_type', runType)
      .eq('target_language_code', languageCode)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok((data as AnalysisRunRow[]).map(toAnalysisRun));
  } catch (e) {
    return handleRepositoryError('analysisRun.listByLanguage', e);
  }
}

/**
 * Delete a run + its events + its pending proposals. Does NOT touch
 * accepted curated rows (the foreign-key SET NULL on every analysis-
 * derived table ensures accepted rows survive with source_run_id = NULL).
 */
async function deleteRunAndProposals(id: string, userId: string): Promise<RepositoryResult<void>> {
  if (DEMO_MODE) return demoAdapter.analysisRun.deleteRunAndProposals(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    // analysis_events and analysis_proposals cascade on run delete.
    const { error } = await supabase
      .from('analysis_runs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return handleRepositoryError('analysisRun.deleteRunAndProposals', e);
  }
}

export const analysisRunRepository = {
  createSourceAnalysisRun,
  createClccRun,
  findById,
  updateStatus,
  appendSummary,
  listByUser,
  listBySource,
  listByLanguage,
  deleteRunAndProposals,
};

export { toAnalysisRun, type AnalysisRunRow };
