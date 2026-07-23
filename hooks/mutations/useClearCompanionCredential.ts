// hooks/mutations/useClearCompanionCredential.ts
// Clear the saved companion credential. Invalidates credential + health +
// capabilities caches so the UI falls back to the "no companion" state.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';
import { clearCompanionCredential } from '../../utils/companion/credential';

export function useClearCompanionCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => clearCompanionCredential(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.companion.credential() });
      qc.invalidateQueries({ queryKey: queryKeys.companion.health() });
      qc.invalidateQueries({ queryKey: queryKeys.companion.capabilities() });
    },
  });
}
