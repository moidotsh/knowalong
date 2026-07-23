// hooks/mutations/useCancelAnalysisRun.ts
// Cancel an in-flight analysis run. Calls the companion cancel endpoint +
// transitions the run row to cancelled. Invalidates the run + source runs
// cache.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { localAnalysisService, clccGenerationService } from '../../services';
import { useCurrentUserId } from '../queries';

export interface CancelAnalysisRunInput {
  runId: string;
  companionJobId: string | null;
  runType: 'source_analysis' | 'clcc_generation';
}

export function useCancelAnalysisRun() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: CancelAnalysisRunInput) => {
      if (input.runType === 'source_analysis') {
        await localAnalysisService.cancel(input.runId, userId!, input.companionJobId);
      } else {
        await clccGenerationService.cancel(input.runId, userId!, input.companionJobId);
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.detail(variables.runId) });
    },
  });
}
