// hooks/mutations/useSaveCompanionCredential.ts
// Paste-and-save a companion credential. Invalidates the credential cache so
// useCompanionCredential + useCompanionHealth re-evaluate.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { writeCompanionCredential } from '../../utils/companion/credential';

export interface SaveCompanionCredentialInput {
  token: string;
  baseUrl?: string;
}

export function useSaveCompanionCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCompanionCredentialInput) =>
      writeCompanionCredential(input.token, input.baseUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companion.credential() });
      qc.invalidateQueries({ queryKey: queryKeys.companion.health() });
      qc.invalidateQueries({ queryKey: queryKeys.companion.capabilities() });
    },
  });
}
