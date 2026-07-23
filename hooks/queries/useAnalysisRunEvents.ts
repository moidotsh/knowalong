// hooks/queries/useAnalysisRunEvents.ts
// Fetches the durable event log for a run (NOT the live SSE stream — that's
// useAnalysisRunEventStream). Used to render the timeline on first render
// before live events arrive, and to rehydrate after navigation.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { analysisEventRepository } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useAnalysisRunEvents(runId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.analysisRuns.events(runId ?? ''),
    queryFn: async () => {
      const res = await analysisEventRepository.findByRun(runId!, userId!);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId && !!runId,
    refetchOnWindowFocus: false,
  });
}
