// hooks/queries/useLearningSources.ts
// Lists all learning sources for the current user.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { learningSourceService } from '../../services';
import { useCurrentUserId } from './useCurrentUserId';

export function useLearningSources() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.sources.list(),
    queryFn: () => learningSourceService.listSources(userId!),
    enabled: !!userId,
  });
}
