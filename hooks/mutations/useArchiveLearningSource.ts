// hooks/mutations/useArchiveLearningSource.ts
// Archives a source. Removes it from the list cache (D3).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { learningSourceService } from '../../services';
import { useCurrentUserId } from '../queries';

export function useArchiveLearningSource() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (sourceId: string) =>
      learningSourceService.archiveSource(sourceId, userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sources.all });
      qc.invalidateQueries({ queryKey: queryKeys.readiness.all });
    },
  });
}
