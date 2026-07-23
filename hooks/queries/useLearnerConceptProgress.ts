// hooks/queries/useLearnerConceptProgress.ts
// Fetches the learner's Core Concept progress for a target language.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { coreConceptRepository, throwIfFailed } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useLearnerConceptProgress(languageCode: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.concepts.learnerProgress(languageCode),
    queryFn: async () => {
      const result = await coreConceptRepository.findLearnerProgress(userId!, languageCode);
      return throwIfFailed(result, 'useLearnerConceptProgress');
    },
    enabled: !!userId,
  });
}
