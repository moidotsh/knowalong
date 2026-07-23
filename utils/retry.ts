// utils/retry.ts
// Retry utility with exponential backoff for async operations.
// Complements `fetchWithRetry` (which is HTTP-specific) — `withRetry`
// wraps any async function.

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration. Reuse across mutations for consistent
 * retry behavior.
 */
export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Execute a function with retry logic and exponential backoff.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * True when an error looks network-related (timeout, connection, etc.).
 * Useful for deciding whether a retry is worth attempting.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  const networkPatterns = [
    'network',
    'timeout',
    'connection',
    'offline',
    'fetch',
    'abort',
    'enetunreach',
    'econnrefused',
    'econnreset',
    'etimedout',
  ];

  return networkPatterns.some((pattern) => errorString.includes(pattern));
}

/**
 * Error categories that mutations commonly produce. Drives the
 * user-facing message + the offline-queue routing decision.
 */
export type MutationErrorType = 'network' | 'offline' | 'unknown';

export interface ClassifiedError {
  type: MutationErrorType;
  message: string;
  originalError: unknown;
}

/**
 * Classify an error and return a user-facing message. `operation` is
 * inserted into the message (e.g. "save entry", "update profile").
 */
export function classifyMutationError(error: unknown, operation: string): ClassifiedError {
  if (error instanceof Error) {
    if (error.message === 'OFFLINE') {
      return {
        type: 'offline',
        message: `Cannot ${operation} while offline. Please try again when connected.`,
        originalError: error,
      };
    }
    if (isNetworkError(error)) {
      return {
        type: 'network',
        message: `Failed to ${operation}. Check your connection and try again.`,
        originalError: error,
      };
    }
  }

  return {
    type: 'unknown',
    message: `Failed to ${operation}. Please try again.`,
    originalError: error,
  };
}
