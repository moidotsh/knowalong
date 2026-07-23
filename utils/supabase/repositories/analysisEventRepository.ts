// utils/supabase/repositories/analysisEventRepository.ts
// Repository for analysis_events (append-only). Persisted by the PWA as
// the SSE stream is consumed. NEVER source text, prompts, tokens, or
// model chain-of-thought.

import type { AnalysisEvent, AnalysisEventSeverity } from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface AnalysisEventRow {
  id: string;
  user_id: string;
  run_id: string;
  ordinal: number;
  severity: string;
  stage: string | null;
  message: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function toAnalysisEvent(row: AnalysisEventRow): AnalysisEvent {
  return {
    id: row.id,
    userId: row.user_id,
    runId: row.run_id,
    ordinal: row.ordinal,
    severity: row.severity as AnalysisEventSeverity,
    stage: row.stage,
    message: row.message,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export interface AppendBatchInput {
  userId: string;
  runId: string;
  events: Array<{
    ordinal: number;
    severity: AnalysisEventSeverity;
    stage?: string | null;
    message: string;
    payload?: Record<string, unknown> | null;
  }>;
}

async function appendBatch(input: AppendBatchInput): Promise<RepositoryResult<AnalysisEvent[]>> {
  if (DEMO_MODE) return demoAdapter.analysisEvent.appendBatch(input);
  if (!input.userId || !input.runId) return unauthorized('Missing user id or run id');
  if (input.events.length === 0) return ok([]);
  try {
    const rows = input.events.map((e) => ({
      user_id: input.userId,
      run_id: input.runId,
      ordinal: e.ordinal,
      severity: e.severity,
      stage: e.stage ?? null,
      message: e.message.slice(0, 500),
      payload: e.payload ?? null,
    }));
    const { data, error } = await supabase
      .from('analysis_events')
      .insert(rows)
      .select('*');
    if (error) throw error;
    return ok((data as AnalysisEventRow[]).map(toAnalysisEvent));
  } catch (e) {
    return handleRepositoryError('analysisEvent.appendBatch', e);
  }
}

async function findByRun(runId: string, userId: string): Promise<RepositoryResult<AnalysisEvent[]>> {
  if (DEMO_MODE) return demoAdapter.analysisEvent.findByRun(runId, userId);
  if (!runId || !userId) return unauthorized('Missing run id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_events')
      .select('*')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .order('ordinal', { ascending: true });
    if (error) throw error;
    return ok((data as AnalysisEventRow[]).map(toAnalysisEvent));
  } catch (e) {
    return handleRepositoryError('analysisEvent.findByRun', e);
  }
}

async function findByRunSince(
  runId: string,
  userId: string,
  sinceOrdinal: number,
): Promise<RepositoryResult<AnalysisEvent[]>> {
  if (DEMO_MODE) return demoAdapter.analysisEvent.findByRunSince(runId, userId, sinceOrdinal);
  if (!runId || !userId) return unauthorized('Missing run id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_events')
      .select('*')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .gt('ordinal', sinceOrdinal)
      .order('ordinal', { ascending: true });
    if (error) throw error;
    return ok((data as AnalysisEventRow[]).map(toAnalysisEvent));
  } catch (e) {
    return handleRepositoryError('analysisEvent.findByRunSince', e);
  }
}

export const analysisEventRepository = {
  appendBatch,
  findByRun,
  findByRunSince,
};

export { toAnalysisEvent, type AnalysisEventRow };
