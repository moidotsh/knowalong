// hooks/mutations/useStartSourceAnalysis.ts
// Start a source-analysis run via the local companion. On success the caller
// navigates to the run-detail route; the SSE lifecycle hook picks up from
// there. Invalidates prior-run cache for the source.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { localAnalysisService } from '../../services';
import { useCurrentUserId } from '../queries';

export function useStartSourceAnalysis() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: { sourceId: string; modelLabel?: string }) =>
      localAnalysisService.start({ userId: userId!, ...input }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.bySource(variables.sourceId) });
    },
  });
}
