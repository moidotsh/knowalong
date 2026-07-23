// hooks/queries/useSourceVocabulary.ts
// Fetches lemmas for a source.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { vocabularyRepository, throwIfFailed } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useSourceVocabulary(sourceId: string | null) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.vocabulary.bySource(sourceId ?? ''),
    queryFn: async () => {
      const result = await vocabularyRepository.findLemmasBySource(sourceId!, userId!);
      return throwIfFailed(result, 'useSourceVocabulary');
    },
    enabled: !!userId && !!sourceId,
  });
}
