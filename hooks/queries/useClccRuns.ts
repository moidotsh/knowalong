// hooks/queries/useClccRuns.ts
// Prior CLCC-generation runs for a language. Listed on /clcc.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { analysisRunRepository } from '../../utils/supabase/repositories';
import { useCurrentUserId } from './useCurrentUserId';

export function useClccRuns(languageCode: 'fr' | 'ru' | 'fa') {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: queryKeys.clcc.byLanguage(languageCode),
    queryFn: async () => {
      const res = await analysisRunRepository.listByLanguage(languageCode, userId!, 'clcc_generation');
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId,
  });
}
