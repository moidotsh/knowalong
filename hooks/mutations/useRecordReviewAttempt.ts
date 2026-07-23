// hooks/mutations/useRecordReviewAttempt.ts
// Records a review attempt. Invalidates the review queue + readiness caches
// so the UI reflects the new scheduler state (D3).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { reviewService } from '../../services';
import type { RecordReviewAttemptDTO } from '@shared/types';
import { useCurrentUserId } from '../queries';

export function useRecordReviewAttempt() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: RecordReviewAttemptDTO) =>
      reviewService.submitReview(userId!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.review.all });
      qc.invalidateQueries({ queryKey: queryKeys.readiness.all });
    },
  });
}
