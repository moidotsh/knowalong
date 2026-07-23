// hooks/mutations/useUpdateLearningSource.ts
// Updates a source's metadata. Optimistic update on the detail cache + list
// invalidation (D3).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { learningSourceService } from '../../services';
import type { UpdateLearningSourceDTO, LearningSource } from '@shared/types';
import { useCurrentUserId } from '../queries';

export function useUpdateLearningSource(sourceId: string) {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: UpdateLearningSourceDTO) =>
      learningSourceService.updateSource(sourceId, userId!, input),
    onMutate: async (input) => {
      const detailKey = queryKeys.sources.detail(sourceId);
      await qc.cancelQueries({ queryKey: detailKey });
      const prev = qc.getQueryData<LearningSource>(detailKey);
      if (prev) {
        qc.setQueryData<LearningSource>(detailKey, { ...prev, ...input });
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.sources.detail(sourceId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sources.detail(sourceId) });
      qc.invalidateQueries({ queryKey: queryKeys.sources.list() });
    },
  });
}
