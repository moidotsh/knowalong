// utils/supabase/repositories/types.ts
// Repository pattern core types. Domain-agnostic — consumers define
// their own entity types (T) and DTOs and return `RepositoryResult<T>`
// from each method. The audit gate (D5) flags any repository method
// that doesn't return `RepositoryResult<T>`.

import type { z } from 'zod';
import { logger } from '../../logger';
import { handleApiError } from '../../errors';

/**
 * Result type for repository operations. Discriminated union on
 * `success` — callers must narrow before reading `data` or `error`.
 */
export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: RepositoryError };

/**
 * Error class for repository failures. Carries a `code` for switch-
 * based handling and an optional cause for chaining.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Helper to create a successful result.
 */
export function ok<T>(data: T): RepositoryResult<T> {
  return { success: true, data };
}

/**
 * Helper to create an error result.
 */
export function err<T = never>(
  message: string,
  code: RepositoryErrorCode,
  cause?: Error,
): RepositoryResult<T> {
  return {
    success: false,
    error: new RepositoryError(message, code, cause),
  };
}

/**
 * Validate data against a Zod schema and return a RepositoryResult.
 * Consumers should call this inside `create` / `update` methods to
 * enforce the wire contract before persisting.
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): RepositoryResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(
    result.error.issues.map((e) => e.message).join(', '),
    RepositoryErrorCode.VALIDATION_ERROR,
  );
}

// ── Error classification ──────────────────────────────────────────────
// Single classification site for repository catch blocks. Duplicating this
// logic across catch sites makes the retry predicate unable to tell a
// missing-table 404 from a transient network blip — producing ~10s spinner
// storms. Centralize it here.
//
// `classifySupabaseError` is the pure mapping; `handleRepositoryError` is
// the catch-block helper that also logs and packs the result.

const SQLSTATE_CODE_MAP: Record<string, RepositoryErrorCode> = {
  // Table / RPC missing — a migration hasn't been applied. Surfaced to
  // the user as an UNKNOWN failure (NOT_FOUND would imply "row not found"
  // semantics); the key property is that it's NOT NETWORK_ERROR, so the
  // retry predicate fails fast instead of hammering the missing endpoint.
  '42P01': RepositoryErrorCode.UNKNOWN,
  '42P02': RepositoryErrorCode.UNKNOWN,
  // RLS denial / insufficient privilege.
  '42501': RepositoryErrorCode.UNAUTHORIZED,
  // Constraint violations.
  '23505': RepositoryErrorCode.CONFLICT,
  '23503': RepositoryErrorCode.VALIDATION_ERROR,
  '23502': RepositoryErrorCode.VALIDATION_ERROR,
  '22001': RepositoryErrorCode.VALIDATION_ERROR,
  '22003': RepositoryErrorCode.VALIDATION_ERROR,
  // Connection / transport (retryable).
  '08006': RepositoryErrorCode.NETWORK_ERROR,
  '08001': RepositoryErrorCode.NETWORK_ERROR,
  '57014': RepositoryErrorCode.NETWORK_ERROR,
  // PostgREST pseudo-codes (no SQLSTATE equivalent).
  PGRST116: RepositoryErrorCode.NOT_FOUND, // .single() / .maybeSingle() returned 0 rows
  PGRST301: RepositoryErrorCode.NOT_FOUND,
  PGRST302: RepositoryErrorCode.NOT_FOUND,
};

interface SupabaseLikeError {
  code?: unknown;
  status?: unknown;
  message?: unknown;
}

/**
 * Inspect a Supabase/PostgREST error shape and return the matching
 * RepositoryErrorCode + normalized message. PostgREST errors carry both
 * `code` (Postgres SQLSTATE or PGRST pseudo-code) and `status` (HTTP).
 * The SQLSTATE/PGRST code wins when present; HTTP status is the fallback
 * for transport errors (gateway 5xx, edge-function timeouts) that don't
 * carry a structured code.
 *
 * Permissive on shape — unknown errors return UNKNOWN rather than
 * throwing. The caller (handleRepositoryError) owns the log + result
 * packing.
 */
export function classifySupabaseError(error: unknown): {
  code: RepositoryErrorCode;
  message: string;
  cause?: Error;
} {
  if (error instanceof RepositoryError) {
    return { code: error.code, message: error.message, cause: error.cause };
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  const cause = error instanceof Error ? error : undefined;

  if (typeof error === 'object' && error !== null) {
    const e = error as SupabaseLikeError;
    // SQLSTATE / PGRST code wins when present.
    if (typeof e.code === 'string' && e.code in SQLSTATE_CODE_MAP) {
      return { code: SQLSTATE_CODE_MAP[e.code], message, cause };
    }
    // HTTP status fallback for transport / gateway errors.
    if (typeof e.status === 'number') {
      if (e.status === 401 || e.status === 403) {
        return { code: RepositoryErrorCode.UNAUTHORIZED, message, cause };
      }
      if (e.status === 404) {
        return { code: RepositoryErrorCode.NOT_FOUND, message, cause };
      }
      if (e.status === 429 || e.status >= 500) {
        return { code: RepositoryErrorCode.NETWORK_ERROR, message, cause };
      }
    }
  }

  return { code: RepositoryErrorCode.UNKNOWN, message, cause };
}

/**
 * Single error-handling site for repository catch blocks. Pass the
 * operation name (for the log line) and the caught error; get back a
 * RepositoryResult carrying the classified error. Centralizes the
 * classify + log + pack boilerplate so every repository method doesn't
 * reimplement it.
 */
export function handleRepositoryError(
  operation: string,
  error: unknown,
): RepositoryResult<never> {
  if (error instanceof RepositoryError) return { success: false, error };
  const c = classifySupabaseError(error);
  logger.warn('repository', `${operation} failed:`, c.message);
  return err(`${operation} failed: ${c.message}`, c.code, c.cause);
}

/**
 * Build the canonical UNAUTHORIZED RepositoryResult for a missing
 * auth credential or failing permission check. Collapses per-repo
 * inline `new RepositoryError('No session', UNAUTHORIZED)` repeats
 * into one call so wording and code stay in lockstep. Caller passes
 * whatever reason applies in their domain ("No session token",
 * "No API key", "Missing tenant context", etc.) — arqavellum leaves the
 * reason open so the helper stays domain-agnostic.
 */
export function unauthorized<T>(reason: string = 'Unauthorized'): RepositoryResult<T> {
  return {
    success: false,
    error: new RepositoryError(reason, RepositoryErrorCode.UNAUTHORIZED),
  };
}

/**
 * Service-layer conversion helper. A repository returns a structured
 * `RepositoryResult<T>`; services throw on failure so React Query and
 * the UI's error boundary can react. This helper collapses the
 * `if (!result.success) { logger.error(...); throw handleApiError(result.error, ctx); } return result.data;`
 * boilerplate into one call.
 *
 * Logs the failure at the call site (tagged 'repository', message
 * includes the context) BEFORE throwing, so operations can locate
 * the failing call without digging through the eventual RQ error
 * logger. Routes through `handleApiError` so the lossy-bridge fix in
 * utils/errors.ts (the RepositoryError instanceof branch + the
 * repoCodeToAppCode switch) preserves the RepositoryErrorCode
 * (NOT_FOUND stays NOT_FOUND instead of silently downgrading to UNKNOWN).
 *
 * Call sites should assign the return value
 * (`const data = throwIfFailed(result, ctx)`) — TS cannot narrow
 * through the function call.
 */
export function throwIfFailed<T>(result: RepositoryResult<T>, context: string): T {
  if (!result.success) {
    logger.error('repository', `${context}: repository returned failure`, result.error);
    throw handleApiError(result.error, context);
  }
  return result.data;
}
