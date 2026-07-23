// utils/supabase/repositories/analysisProposalRepository.ts
// Repository for analysis_proposals (the proposal-first draft layer).

import type {
  AnalysisProposal,
  AnalysisProposalKind,
  ReviewStatus,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, handleRepositoryError, unauthorized } from './types';
import { supabase } from '../client';
import { DEMO_MODE } from './demoMode';
import { demoAdapter } from './demoAdapter';

interface AnalysisProposalRow {
  id: string;
  user_id: string;
  run_id: string;
  proposal_kind: string;
  ordinal: number;
  review_status: string;
  payload: Record<string, unknown>;
  edited_payload: Record<string, unknown> | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toAnalysisProposal(row: AnalysisProposalRow): AnalysisProposal {
  return {
    id: row.id,
    userId: row.user_id,
    runId: row.run_id,
    proposalKind: row.proposal_kind as AnalysisProposalKind,
    ordinal: row.ordinal,
    reviewStatus: row.review_status as ReviewStatus,
    payload: row.payload,
    editedPayload: row.edited_payload,
    reviewerNote: row.reviewer_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateBatchInput {
  userId: string;
  runId: string;
  proposals: Array<{
    proposalKind: AnalysisProposalKind;
    ordinal: number;
    payload: Record<string, unknown>;
  }>;
}

async function createBatch(input: CreateBatchInput): Promise<RepositoryResult<AnalysisProposal[]>> {
  if (DEMO_MODE) return demoAdapter.analysisProposal.createBatch(input);
  if (!input.userId || !input.runId) return unauthorized('Missing user id or run id');
  if (input.proposals.length === 0) return ok([]);
  try {
    const rows = input.proposals.map((p) => ({
      user_id: input.userId,
      run_id: input.runId,
      proposal_kind: p.proposalKind,
      ordinal: p.ordinal,
      review_status: 'pending' as const,
      payload: p.payload,
    }));
    const { data, error } = await supabase
      .from('analysis_proposals')
      .insert(rows)
      .select('*');
    if (error) throw error;
    return ok((data as AnalysisProposalRow[]).map(toAnalysisProposal));
  } catch (e) {
    return handleRepositoryError('analysisProposal.createBatch', e);
  }
}

async function findByRun(runId: string, userId: string): Promise<RepositoryResult<AnalysisProposal[]>> {
  if (DEMO_MODE) return demoAdapter.analysisProposal.findByRun(runId, userId);
  if (!runId || !userId) return unauthorized('Missing run id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_proposals')
      .select('*')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .order('proposal_kind', { ascending: true })
      .order('ordinal', { ascending: true });
    if (error) throw error;
    return ok((data as AnalysisProposalRow[]).map(toAnalysisProposal));
  } catch (e) {
    return handleRepositoryError('analysisProposal.findByRun', e);
  }
}

async function findById(id: string, userId: string): Promise<RepositoryResult<AnalysisProposal | null>> {
  if (DEMO_MODE) return demoAdapter.analysisProposal.findById(id, userId);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_proposals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? toAnalysisProposal(data as AnalysisProposalRow) : null);
  } catch (e) {
    return handleRepositoryError('analysisProposal.findById', e);
  }
}

async function findByRunAndKind(
  runId: string,
  userId: string,
  kind: AnalysisProposalKind,
): Promise<RepositoryResult<AnalysisProposal[]>> {
  if (DEMO_MODE) return demoAdapter.analysisProposal.findByRunAndKind(runId, userId, kind);
  if (!runId || !userId) return unauthorized('Missing run id or user id');
  try {
    const { data, error } = await supabase
      .from('analysis_proposals')
      .select('*')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .eq('proposal_kind', kind)
      .order('ordinal', { ascending: true });
    if (error) throw error;
    return ok((data as AnalysisProposalRow[]).map(toAnalysisProposal));
  } catch (e) {
    return handleRepositoryError('analysisProposal.findByRunAndKind', e);
  }
}

async function updateReviewStatus(
  id: string,
  userId: string,
  patch: {
    reviewStatus: ReviewStatus;
    reviewerNote?: string | null;
    editedPayload?: Record<string, unknown> | null;
  },
): Promise<RepositoryResult<AnalysisProposal>> {
  if (DEMO_MODE) return demoAdapter.analysisProposal.updateReviewStatus(id, userId, patch);
  if (!id || !userId) return unauthorized('Missing id or user id');
  try {
    const update: Record<string, unknown> = {
      review_status: patch.reviewStatus,
      reviewed_at: new Date().toISOString(),
    };
    if (patch.reviewerNote !== undefined) update.reviewer_note = patch.reviewerNote;
    if (patch.editedPayload !== undefined) update.edited_payload = patch.editedPayload;
    const { data, error } = await supabase
      .from('analysis_proposals')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return ok(toAnalysisProposal(data as AnalysisProposalRow));
  } catch (e) {
    return handleRepositoryError('analysisProposal.updateReviewStatus', e);
  }
}

async function markSuperseded(
  id: string,
  userId: string,
  reviewerNote: string,
): Promise<RepositoryResult<AnalysisProposal>> {
  return updateReviewStatus(id, userId, { reviewStatus: 'superseded', reviewerNote });
}

export const analysisProposalRepository = {
  createBatch,
  findByRun,
  findById,
  findByRunAndKind,
  updateReviewStatus,
  markSuperseded,
};

export { toAnalysisProposal, type AnalysisProposalRow };
