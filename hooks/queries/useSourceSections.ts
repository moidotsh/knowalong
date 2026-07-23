// hooks/queries/useSourceSections.ts
// Fetches sections + lines for a source.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { sourceSectionRepository, throwIfFailed } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useSourceSections(sourceId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.sections.bySource(sourceId ?? ''),
    queryFn: async () => {
      const result = await sourceSectionRepository.findBySource(sourceId!, userId!);
      return throwIfFailed(result, 'useSourceSections');
    },
    enabled: !!userId && !!sourceId,
  });
}
