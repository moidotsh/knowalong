// hooks/queries/useCompanionHealth.ts
// Polls the companion /health endpoint. Used by the CompanionStatusChip to
// show green/amber/red/grey. The query is enabled only when a credential is
// saved (no point in polling if we have no token to send).

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { companionClientService } from '../../services';
import { readCompanionCredential } from '../../utils/companion/credential';
import { useCompanionCredential } from './useCompanionCredential';

const HEALTH_POLL_MS = 30_000;

export function useCompanionHealth() {
  const credentialQuery = useCompanionCredential();
  const hasCredential = !!credentialQuery.data;
  return useQuery({
    queryKey: queryKeys.companion.health(),
    queryFn: async () => {
      const result = await companionClientService.getHealth();
      if ('status' in result && result.status === 'ok') return result.data;
      // Surface the specific error kind via the `error` field — the chip
      // renders grey for "no credential" and red for any specific error.
      throw result;
    },
    enabled: hasCredential,
    refetchInterval: HEALTH_POLL_MS,
    retry: false,
  });
}
