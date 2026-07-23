// lib/react-query/index.ts
// Barrel export for the React Query layer. Audit-barrels treats this as the
// canonical entry — import from `lib/react-query`, not from individual files.
export { queryClient, defaultQueryOptions, defaultMutationOptions, setupQueryErrorHandlers, registerAuthErrorHandler } from './queryClient';
export { queryKeys } from './queryKeys';
export { QueryProvider } from './QueryProvider';
