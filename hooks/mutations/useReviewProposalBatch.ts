// hooks/mutations/useReviewProposalBatch.ts
// Batch acceptance of proposals. Per-proposal independent outcomes — no
// all-or-nothing claim. The caller passes an array of proposalIds; the
// service iterates and returns per-proposal outcomes. Invalidates the same
// downstream caches as useReviewProposal.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { proposalReviewService } from '../../services';
import type { ProposalBatchOutcome } from '../../shared/types/knowalong';
import { useCurrentUserId } from '../queries';

export function useReviewProposalBatch() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: { runId: string; proposalIds: string[] }): Promise<ProposalBatchOutcome[]> =>
      proposalReviewService.acceptBatch(input.proposalIds, userId!),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.proposals(variables.runId) });
      qc.invalidateQueries({ queryKey: queryKeys.cards.all });
      qc.invalidateQueries({ queryKey: queryKeys.vocabulary.all });
      qc.invalidateQueries({ queryKey: queryKeys.sections.all });
    },
  });
}
