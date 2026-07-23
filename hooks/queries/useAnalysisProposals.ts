// hooks/queries/useAnalysisProposals.ts
// Fetches all proposals for a run, optionally filtered by kind. The ProposalCard
// and ProposalReviewBatch read this and call the review mutations to update.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { analysisProposalRepository } from '../../utils/supabase/repositories';
import type { AnalysisProposalKind } from '../../shared/types/knowalong';
import { useCurrentUserId } from './useCurrentUserId';

export function useAnalysisProposals(
  runId: string | null,
  filter?: { kind?: AnalysisProposalKind },
) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.analysisRuns.proposals(runId ?? '', filter?.kind),
    queryFn: async () => {
      if (filter?.kind) {
        const res = await analysisProposalRepository.findByRunAndKind(runId!, userId!, filter.kind);
        if (!res.success) throw res.error;
        return res.data;
      }
      const res = await analysisProposalRepository.findByRun(runId!, userId!);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId && !!runId,
  });
}
