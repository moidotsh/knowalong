// hooks/queries/useSourceAnalysisRuns.ts
// Prior source-analysis runs for a source. Listed on the analysis tab.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { analysisRunRepository } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useSourceAnalysisRuns(sourceId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.analysisRuns.bySource(sourceId ?? ''),
    queryFn: async () => {
      const res = await analysisRunRepository.listBySource(sourceId!, userId!);
      if (!res.success) throw res.error;
      // Source-analysis runs only (exclude any clcc runs that might leak in
      // via a future query path).
      return res.data.filter((r) => r.runType === 'source_analysis');
    },
    enabled: !!userId && !!sourceId,
  });
}
