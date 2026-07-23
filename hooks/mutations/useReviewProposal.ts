// hooks/mutations/useReviewProposal.ts
// Apply a single-proposal review action (accept/edit/reject) via the
// proposalReviewService acceptance matrix. Invalidates the proposals cache
// for the run, plus downstream caches (cards, vocabulary, sections) that
// might reflect accepted proposals.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { proposalReviewService } from '../../services';
import type { ReviewProposalDTO } from '../../shared/types/knowalong';
import { useCurrentUserId } from '../queries';

export function useReviewProposal() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: ReviewProposalDTO & { runId: string }) => {
      const { runId: _runId, ...dto } = input;
      void _runId;
      if (dto.action === 'accept') {
        return proposalReviewService.acceptProposal(dto.proposalId, userId!);
      }
      if (dto.action === 'edit') {
        return proposalReviewService.editProposal(
          dto.proposalId,
          userId!,
          dto.editedPayload ?? {},
          dto.reviewerNote,
        );
      }
      return proposalReviewService.rejectProposal(dto.proposalId, userId!, dto.reviewerNote);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.proposals(variables.runId) });
      // Accepted proposals may land in any of these tables; invalidate all.
      qc.invalidateQueries({ queryKey: queryKeys.cards.all });
      qc.invalidateQueries({ queryKey: queryKeys.vocabulary.all });
      qc.invalidateQueries({ queryKey: queryKeys.sections.all });
    },
  });
}
