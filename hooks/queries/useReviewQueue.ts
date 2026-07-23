// hooks/queries/useReviewQueue.ts
// Fetches the due-card queue for the current user.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { reviewService } from '../../services';
import { useCurrentUserId } from './useCurrentUserId';

export function useReviewQueue(limit: number = 20) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.review.queue(limit),
    queryFn: () => reviewService.getDueQueue(userId!, limit),
    enabled: !!userId,
  });
}
