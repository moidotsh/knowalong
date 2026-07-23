// hooks/queries/useCompanionCapabilities.ts
// Fetches /capabilities (supported run types + available models). Used by
// the settings page and the start-analysis/start-clcc CTAs.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { companionClientService } from '../../services';
import { useCompanionCredential } from './useCompanionCredential';

export function useCompanionCapabilities() {
  const credentialQuery = useCompanionCredential();
  const hasCredential = !!credentialQuery.data;
  return useQuery({
    queryKey: queryKeys.companion.capabilities(),
    queryFn: async () => {
      const result = await companionClientService.getCapabilities();
      if ('status' in result && result.status === 'ok') return result.data;
      throw result;
    },
    enabled: hasCredential,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
