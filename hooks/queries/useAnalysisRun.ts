// hooks/queries/useAnalysisRun.ts
// Fetches a single analysis_run by id. The hook caller is responsible for
// re-fetching on event-stream terminal signals (via queryClient.invalidate).

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { analysisRunRepository } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useAnalysisRun(runId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.analysisRuns.detail(runId ?? ''),
    queryFn: async () => {
      const res = await analysisRunRepository.findById(runId!, userId!);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId && !!runId,
    refetchInterval: (query) => {
      // Stop polling once the run reaches a terminal state.
      const status = query.state.data?.status;
      if (status === 'awaiting_review' || status === 'failed' || status === 'cancelled') {
        return false;
      }
      return 5_000;
    },
  });
}
