// hooks/queries/useSourceReadiness.ts
// Computes readiness for a source (all source-derived cards).

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { readinessService } from '../../services';
import { useCurrentUserId } from './useCurrentUserId';

export function useSourceReadiness(sourceId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.readiness.source(sourceId ?? ''),
    queryFn: () => readinessService.computeForSource(sourceId!, userId!),
    enabled: !!userId && !!sourceId,
  });
}
