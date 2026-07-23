// hooks/queries/useLearningSource.ts
// Fetches a single learning source by ID.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { learningSourceService } from '../../services';
import { useCurrentUserId } from './useCurrentUserId';

export function useLearningSource(sourceId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.sources.detail(sourceId ?? ''),
    queryFn: () => learningSourceService.getSource(sourceId!, userId!),
    enabled: !!userId && !!sourceId,
  });
}
