// utils/errors.ts
// Standardized error handling. AppError is the boundary-crossing error type —
// audit-logging-errors (S10) blocks raw `throw new Error(...)` outside its
// carve-out and expects AppError for anything that crosses a service boundary.

// Note: utils/errors ↔ utils/supabase/repositories/types is a bidirectional
// cycle (errors needs RepositoryError for instanceof; types needs
// handleApiError for throwIfFailed). Works because handleApiError is a
// hoisted function declaration and types.ts invokes it only inside the
// throwIfFailed function body — never at module init.
import { RepositoryError, RepositoryErrorCode } from './supabase/repositories';

export enum ErrorCode {
  NETWORK_ERROR = 'ERR_NETWORK',
  TIMEOUT = 'ERR_TIMEOUT',
  SERVER_ERROR = 'ERR_SERVER',
  RATE_LIMITED = 'ERR_RATE_LIMITED',

  AUTH_ERROR = 'ERR_AUTH',
  INVALID_CREDENTIALS = 'ERR_INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'ERR_SESSION_EXPIRED',
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',

  VALIDATION_ERROR = 'ERR_VALIDATION',
  INVALID_INPUT = 'ERR_INVALID_INPUT',
  DUPLICATE_ENTRY = 'ERR_DUPLICATE',

  NOT_FOUND = 'ERR_NOT_FOUND',
  DATA_CORRUPTION = 'ERR_DATA_CORRUPTION',
  ENCRYPTION_ERROR = 'ERR_ENCRYPTION',

  STORAGE_ERROR = 'ERR_STORAGE',
  STORAGE_FULL = 'ERR_STORAGE_FULL',

  UNKNOWN = 'ERR_UNKNOWN',
  CANCELLED = 'ERR_CANCELLED',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    options?: {
      details?: unknown;
      recoverable?: boolean;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details;
    this.timestamp = new Date();
    this.recoverable = options?.recoverable ?? isRecoverableCode(code);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static fromUnknown(error: unknown, defaultMessage = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }
    if (error instanceof Error) {
      return new AppError(error.message, ErrorCode.UNKNOWN, {
        cause: error,
        details: error,
      });
    }
    return new AppError(defaultMessage, ErrorCode.UNKNOWN, { details: error });
  }

  is(code: ErrorCode): boolean {
    return this.code === code;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
    };
  }
}

function isRecoverableCode(code: ErrorCode): boolean {
  const recoverableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.RATE_LIMITED,
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.STORAGE_FULL,
  ];
  return recoverableCodes.includes(code);
}

export function getUserFriendlyMessage(error: AppError | Error | unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Unable to connect. Please check your internet connection and try again.';
      case ErrorCode.TIMEOUT:
        return 'The request took too long. Please try again.';
      case ErrorCode.SERVER_ERROR:
        return 'Server error. Please try again later.';
      case ErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCode.AUTH_ERROR:
      case ErrorCode.INVALID_CREDENTIALS:
        return 'Invalid credentials. Please try again.';
      case ErrorCode.SESSION_EXPIRED:
        return 'Your session has expired. Please log in again.';
      case ErrorCode.UNAUTHORIZED:
        return 'You are not authorized to perform this action.';
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        return error.message || 'Invalid input. Please check your entries.';
      case ErrorCode.DUPLICATE_ENTRY:
        return 'This entry already exists.';
      case ErrorCode.NOT_FOUND:
        return 'The requested item was not found.';
      case ErrorCode.DATA_CORRUPTION:
        return 'Data corruption detected. Please contact support.';
      case ErrorCode.ENCRYPTION_ERROR:
        return 'Unable to secure your data. Please try again.';
      case ErrorCode.STORAGE_ERROR:
      case ErrorCode.STORAGE_FULL:
        return 'Storage error. Please free up space and try again.';
      case ErrorCode.CANCELLED:
        return 'Operation cancelled.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }

  return 'An unexpected error occurred.';
}

export function handleApiError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // RepositoryError — must run BEFORE isSupabaseError because RepositoryError
  // duck-types as a SupabaseError (has `.message`) and would otherwise fall
  // into mapSupabaseCode with a non-SQLSTATE `.code` (the literal "NOT_FOUND")
  // and silently downgrade to UNKNOWN. See repoCodeToAppCode below.
  if (error instanceof RepositoryError) {
    const code = repoCodeToAppCode(error.code);
    return new AppError(error.message, code, {
      cause: error.cause,
      details: { context, repositoryCode: error.code },
    });
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AppError('Network request failed', ErrorCode.NETWORK_ERROR, {
      cause: error as Error,
      details: { context },
    });
  }

  if (isSupabaseError(error)) {
    return handleSupabaseError(error, context);
  }

  if (error instanceof Error) {
    return new AppError(error.message, ErrorCode.UNKNOWN, {
      cause: error,
      details: { context },
    });
  }

  return new AppError('An unexpected error occurred', ErrorCode.UNKNOWN, {
    details: { error, context },
  });
}

/**
 * RepositoryError → AppError code mapping. The load-bearing switch that
 * keeps retry decisions consistent across both pipelines: a `RepositoryError`
 * thrown via `throwIfFailed` (in `utils/supabase/repositories/types.ts`)
 * gets the same `ErrorCode` it would have had if the retry predicate
 * (`lib/react-query/queryClient.ts`) inspected the RepositoryError directly.
 *
 * `NETWORK_ERROR → NETWORK_ERROR` (recoverable); all other codes map to
 * non-recoverable. Without this mapping, `RepositoryError` instances
 * fall through to the `isSupabaseError` branch and get mapped via
 * `mapSupabaseCode(error.code)` — but `.code` on a RepositoryError is the
 * literal string "NOT_FOUND", not a SQLSTATE, so every code silently
 * downgrades to UNKNOWN, defeats the retry predicate's tightening, and
 * produces ~10s spinner storms on 404 / 42P01 / 42501.
 *
 * Implemented as a switch (not a top-level const map) so the
 * `RepositoryErrorCode` enum is referenced at call time, not at
 * module-init time. utils/errors ↔ utils/supabase/repositories/types
 * is a genuine bidirectional cycle (errors needs RepositoryError for
 * instanceof; types needs handleApiError for throwIfFailed); a top-level
 * const map would access the enum during utils/errors module init,
 * before types has finished evaluating its enum. A switch inside a
 * function body defers the lookup to first call, by which point both
 * modules have fully loaded.
 */
function repoCodeToAppCode(code: RepositoryErrorCode): ErrorCode {
  switch (code) {
    case RepositoryErrorCode.NOT_FOUND: return ErrorCode.NOT_FOUND;
    case RepositoryErrorCode.VALIDATION_ERROR: return ErrorCode.VALIDATION_ERROR;
    case RepositoryErrorCode.STORAGE_ERROR: return ErrorCode.STORAGE_ERROR;
    case RepositoryErrorCode.NETWORK_ERROR: return ErrorCode.NETWORK_ERROR;
    case RepositoryErrorCode.CONFLICT: return ErrorCode.DUPLICATE_ENTRY;
    case RepositoryErrorCode.UNAUTHORIZED: return ErrorCode.UNAUTHORIZED;
    case RepositoryErrorCode.UNKNOWN:
    default:
      return ErrorCode.UNKNOWN;
  }
}

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function handleSupabaseError(error: SupabaseError, context?: string): AppError {
  const code = mapSupabaseCode(error.code);

  return new AppError(error.message || 'Database error', code, {
    details: {
      supabaseCode: error.code,
      supabaseDetails: error.details,
      supabaseHint: error.hint,
      context,
    },
  });
}

function mapSupabaseCode(code?: string): ErrorCode {
  if (!code) return ErrorCode.UNKNOWN;

  const codeMap: Record<string, ErrorCode> = {
    // undefined_table / undefined_parameter — a migration hasn't been
    // applied. NOT_FOUND on the AppError side (vs UNKNOWN on the repo
    // side in classifySupabaseError) — AppError consumers like
    // handleApiError don't have the same retry interaction; surfacing
    // the missing-table case as NOT_FOUND is accurate for callers that
    // don't go through the repository pipeline.
    '42P01': ErrorCode.NOT_FOUND,
    '42P02': ErrorCode.NOT_FOUND,
    // insufficient_privilege — RLS denial.
    '42501': ErrorCode.UNAUTHORIZED,
    // PGRST116 — PostgREST .single() returned 0 rows; read as NOT_FOUND.
    PGRST116: ErrorCode.NOT_FOUND,
    PGRST301: ErrorCode.NOT_FOUND,
    PGRST302: ErrorCode.NOT_FOUND,
    '23505': ErrorCode.DUPLICATE_ENTRY,
    '23503': ErrorCode.VALIDATION_ERROR,
    '23502': ErrorCode.VALIDATION_ERROR,
    '22001': ErrorCode.VALIDATION_ERROR,
    '22003': ErrorCode.VALIDATION_ERROR,
    '08006': ErrorCode.NETWORK_ERROR,
    '08001': ErrorCode.NETWORK_ERROR,
    '57014': ErrorCode.TIMEOUT,
  };

  return codeMap[code] || ErrorCode.UNKNOWN;
}

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

export async function tryAsync<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<Result<T>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure(handleApiError(error, context));
  }
}

export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailure<T>(result: Result<T>): result is { success: false; error: AppError } {
  return result.success === false;
}

export default AppError;
