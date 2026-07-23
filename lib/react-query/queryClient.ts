// lib/react-query/queryClient.ts
// React Query client configuration. Queries and mutations funnel errors
// through handleApiError; auth-class errors trigger the registered handler
// (set up by fromAuthProvider).

import { QueryClient } from '@tanstack/react-query';
import { AppError, handleApiError } from '../../utils/errors';
import { RepositoryError, RepositoryErrorCode } from '../../utils/supabase/repositories';
import logger from '../../utils/logger';

export const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  // Fail fast on non-recoverable errors — no spinner storm on 404 / 401 /
  // missing-table 42P01 / validation. AppError already classifies
  // recoverability at construction (see isRecoverableCode in utils/errors);
  // RepositoryError needs an explicit code check (only NETWORK_ERROR is
  // worth retrying — anything else will fail identically on the next attempt).
  retry: (failureCount: number, error: unknown) => {
    if (error instanceof AppError) return error.recoverable && failureCount < 3;
    if (error instanceof RepositoryError) {
      return error.code === RepositoryErrorCode.NETWORK_ERROR && failureCount < 3;
    }
    return failureCount < 3;
  },
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  throwOnError: false,
};

export const defaultMutationOptions = {
  retry: 1,
  throwOnError: false,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
});

let onAuthError: (() => void) | null = null;

export function registerAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

function isAuthError(appError: AppError): boolean {
  return (
    appError.code === 'ERR_AUTH' ||
    appError.code === 'ERR_UNAUTHORIZED' ||
    appError.code === 'ERR_SESSION_EXPIRED' ||
    /401|AUTH_SESSION_EXPIRED|not authenticated/i.test(appError.message)
  );
}

export function setupQueryErrorHandlers(): () => void {
  const queryUnsub = queryClient.getQueryCache().subscribe((event) => {
    if (event?.type === 'updated' && event.query.state.status === 'error') {
      const error = event.query.state.error;
      const appError = handleApiError(error, `Query: ${event.query.queryHash}`);
      if (isAuthError(appError)) {
        onAuthError?.();
      }
      logger.error('queries', 'Query error', appError, {
        queryKey: event.query.queryKey,
      });
    }
  });

  const mutationUnsub = queryClient.getMutationCache().subscribe((event) => {
    if (event?.type === 'updated' && event.mutation.state.status === 'error') {
      const error = event.mutation.state.error;
      const appError = handleApiError(error, `Mutation: ${event.mutation.mutationId}`);
      if (isAuthError(appError)) {
        onAuthError?.();
      }
      logger.error('mutations', 'Mutation error', appError, {
        mutationKey: event.mutation.options.mutationKey,
      });
    }
  });

  return () => {
    queryUnsub();
    mutationUnsub();
  };
}
