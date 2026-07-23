// hooks/mutations/useStartClccGeneration.ts
// Start a CLCC generation run via the local companion. Invalidates the
// per-language run cache on success.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { clccGenerationService } from '../../services';
import { useCurrentUserId } from '../queries';

export function useStartClccGeneration() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: { targetLanguageCode: 'fr' | 'ru' | 'fa'; coreConceptCodes: string[]; modelLabel?: string }) =>
      clccGenerationService.start({ userId: userId!, ...input }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clcc.byLanguage(variables.targetLanguageCode) });
    },
  });
}
