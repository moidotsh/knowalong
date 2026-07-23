// hooks/mutations/useCreateLearningSource.ts
// Creates a new lyric draft source. Invalidates the sources list + readiness
// caches (D3 — every mutation touches a cache primitive).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { learningSourceService } from '../../services';
import type { CreateLyricDraftDTO } from '@shared/types';
import { useCurrentUserId } from '../queries';

export function useCreateLearningSource() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: CreateLyricDraftDTO) =>
      learningSourceService.createDraft(userId!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sources.all });
      qc.invalidateQueries({ queryKey: queryKeys.readiness.all });
    },
  });
}
