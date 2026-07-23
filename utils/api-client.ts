// utils/api-client.ts
// Low-level fetch wrapper with timeout + retry. This file is one of two
// legitimate raw-fetch sites (audit S8 exempts it — wrapping fetchWithRetry
// through itself would infinite-loop). Consumers should never call fetch
// directly; they go through fetchWithRetry here, or — preferably — through
// the repository layer (utils/supabase/repositories/*).

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

import { AppError, ErrorCode } from './errors';

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT,
  maxRetries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new AppError(`Server error: ${response.status}`, ErrorCode.SERVER_ERROR, {
        details: { status: response.status },
      });
    } catch (error) {
      lastError = error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : String(error),
            ErrorCode.NETWORK_ERROR,
            { cause: error instanceof Error ? error : undefined },
          );

      if (lastError.name === 'AbortError') {
        throw new AppError(`Request timed out after ${timeout}ms`, ErrorCode.TIMEOUT);
      }
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  throw lastError || new AppError('Request failed after all retries', ErrorCode.NETWORK_ERROR);
}
