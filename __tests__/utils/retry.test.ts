import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  isNetworkError,
  classifyMutationError,
  DEFAULT_RETRY_OPTIONS,
} from '../../utils/retry';

describe('withRetry', () => {
  it('returns the result of a successful call without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns the result once it succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');
    // Real timers + 1ms delays keep the test fast without the
    // fake-timer/unhandled-rejection race that mockRejectedValue triggers.
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 1, maxDelay: 1 }))
      .rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('invokes onRetry with the attempt number and error', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce('ok');
    await withRetry(fn, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 1,
      onRetry,
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ message: 'first' }));
  });

  it('respects DEFAULT_RETRY_OPTIONS shape', () => {
    expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_OPTIONS.baseDelay).toBe(1000);
    expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(10000);
  });
});

describe('isNetworkError', () => {
  it('returns true for network-pattern messages', () => {
    expect(isNetworkError(new Error('network unreachable'))).toBe(true);
    expect(isNetworkError(new Error('Request timeout'))).toBe(true);
    expect(isNetworkError(new Error('connection refused'))).toBe(true);
    expect(isNetworkError(new Error('failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isNetworkError(new Error('abort signal received'))).toBe(true);
  });

  it('returns false for non-network errors', () => {
    expect(isNetworkError(new Error('Invalid credentials'))).toBe(false);
    expect(isNetworkError(new Error('Not found'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError('a string error')).toBe(false);
  });

  it('handles non-Error inputs', () => {
    // String-coerced; the function does not duck-type `.message` on objects.
    expect(isNetworkError('the network broke')).toBe(true);
    expect(isNetworkError({ message: 'timeout' })).toBe(false);
  });
});

describe('classifyMutationError', () => {
  it('classifies OFFLINE messages as offline', () => {
    const result = classifyMutationError(new Error('OFFLINE'), 'save entry');
    expect(result.type).toBe('offline');
    expect(result.message).toContain('Cannot save entry while offline');
  });

  it('classifies network-pattern errors as network', () => {
    const result = classifyMutationError(new Error('network timeout'), 'update profile');
    expect(result.type).toBe('network');
    expect(result.message).toContain('Failed to update profile. Check your connection');
  });

  it('classifies unknown errors as unknown', () => {
    const result = classifyMutationError(new Error('Invalid email'), 'register');
    expect(result.type).toBe('unknown');
    expect(result.message).toContain('Failed to register. Please try again.');
  });

  it('preserves the original error reference', () => {
    const original = new Error('boom');
    const result = classifyMutationError(original, 'op');
    expect(result.originalError).toBe(original);
  });

  it('handles non-Error inputs as unknown', () => {
    const result = classifyMutationError('string error', 'op');
    expect(result.type).toBe('unknown');
    expect(result.originalError).toBe('string error');
  });
});
