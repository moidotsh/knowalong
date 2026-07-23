// hooks/queries/useCompanionCredential.ts
// Read-only hook for the saved companion credential (token + base URL).
// Does NOT expose the token to renderers — they only need to know whether
// a credential is saved + the baseUrl. The token travels exclusively in
// the Authorization header of companionClient calls.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { readCompanionCredential } from '../../utils/companion/credential';

export interface CompanionCredentialView {
  hasCredential: boolean;
  baseUrl: string;
}

export function useCompanionCredential() {
  return useQuery({
    queryKey: queryKeys.companion.credential(),
    queryFn: async (): Promise<CompanionCredentialView> => {
      const cred = await readCompanionCredential();
      if (!cred) return { hasCredential: false, baseUrl: '' };
      return { hasCredential: true, baseUrl: cred.baseUrl };
    },
    staleTime: Infinity,
    retry: false,
  });
}
