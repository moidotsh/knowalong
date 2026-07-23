// lib/react-query/QueryProvider.tsx
// React Query provider wrapper. Sets up the queryClient and the global
// error handlers (auth-error detection → registered handler).

import { ReactNode, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupQueryErrorHandlers } from './queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    const unsubscribe = setupQueryErrorHandlers();
    return unsubscribe;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
