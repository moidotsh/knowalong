// hooks/mutations/useDeleteAnalysisRun.ts
// Delete a run + its events + pending proposals. Does NOT touch accepted
// curated rows (foreign-key SET NULL preserves them with source_run_id NULL).
// Invalidates the run + source/language cache.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { localAnalysisService, clccGenerationService } from '../../services';
import { useCurrentUserId } from '../queries';

export interface DeleteAnalysisRunInput {
  runId: string;
  runType: 'source_analysis' | 'clcc_generation';
  sourceId?: string | null;
  targetLanguageCode?: string | null;
}

export function useDeleteAnalysisRun() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async (input: DeleteAnalysisRunInput) => {
      if (input.runType === 'source_analysis') {
        await localAnalysisService.deleteRun(input.runId, userId!);
      } else {
        await clccGenerationService.deleteRun(input.runId, userId!);
      }
    },
    onSuccess: (_data, variables) => {
      if (variables.runType === 'source_analysis' && variables.sourceId) {
        qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.bySource(variables.sourceId) });
      } else if (variables.runType === 'clcc_generation' && variables.targetLanguageCode) {
        qc.invalidateQueries({ queryKey: queryKeys.clcc.byLanguage(variables.targetLanguageCode) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.analysisRuns.detail(variables.runId) });
    },
  });
}
