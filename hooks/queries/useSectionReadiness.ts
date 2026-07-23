// hooks/queries/useSectionReadiness.ts
// Computes readiness for a single section within a source.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { readinessService } from '../../services';
import { useCurrentUserId } from './useCurrentUserId';

export function useSectionReadiness(sourceId: string | null, sectionId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.readiness.section(sourceId ?? '', sectionId ?? ''),
    queryFn: () => readinessService.computeForSection(sourceId!, sectionId!, userId!),
    enabled: !!userId && !!sourceId && !!sectionId,
  });
}
