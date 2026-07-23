// utils/supabase/index.ts
// Barrel for the Supabase client + auth + repository layer. Domain
// code imports from here (`@utils/supabase`) — never directly from
// `@supabase/supabase-js` (S9 blocks that).

export { supabase, default } from './client';
export {
  AuthService,
  type AuthSession,
  type AuthResult,
} from './AuthService';
export {
  type RepositoryResult,
  RepositoryError,
  RepositoryErrorCode,
  ok,
  err,
  validateWithSchema,
  unauthorized,
  throwIfFailed,
} from './repositories';
export { withRpcTelemetry } from './rpcTelemetry';
