import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  truncateUUID,
  formatDate,
} from '../../shared/utils/formatters';

describe('isValidUUID', () => {
  it('accepts a valid v4 UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts a valid v1 UUID', () => {
    expect(isValidUUID('a0eebc99-9c0b-1ef8-bb6d-6bb9bd380a11')).toBe(true);
  });

  it('rejects a UUID with wrong variant bits', () => {
    // The third group must start with 1-5; the fourth group must start with 8, 9, a, or b.
    expect(isValidUUID('550e8400-e29b-61d4-c716-446655440000')).toBe(false);
  });

  it('rejects too-short strings', () => {
    expect(isValidUUID('550e8400')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(false);
  });
});

describe('truncateUUID', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000';

  it('returns the input unchanged when shorter than the threshold', () => {
    expect(truncateUUID('short')).toBe('short');
    expect(truncateUUID('exactly-16-chars')).toBe('exactly-16-chars');
  });

  it('returns the input unchanged when exactly equal to prefix + suffix', () => {
    // 8 prefix + 8 suffix = 16. A 16-char string is not truncated.
    expect(truncateUUID('0123456789012345')).toBe('0123456789012345');
  });

  it('truncates with default prefix/suffix of 8 chars', () => {
    const result = truncateUUID(uuid);
    // 8 prefix chars + '...' + 8 suffix chars (last 8 of the UUID).
    expect(result).toBe('550e8400...55440000');
  });

  it('respects custom prefix and suffix lengths', () => {
    const result = truncateUUID(uuid, 4, 4);
    expect(result).toBe('550e...0000');
  });

  it('handles empty input', () => {
    expect(truncateUUID('')).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a date with the default "MMM d, yyyy" pattern', () => {
    // formatters.ts uses date-fns directly (per its header), so date-only
    // ISO strings inherit date-fns's UTC interpretation. Western longitudes
    // see the previous calendar day — accept both.
    expect(formatDate('2024-03-20')).toMatch(/Mar 19, 2024|Mar 20, 2024/);
  });

  it('respects a custom format string', () => {
    expect(formatDate('2024-03-20', 'yyyy-MM-dd')).toMatch(/2024-03-19|2024-03-20/);
    expect(formatDate('2024-03-20', 'M/d/yyyy')).toMatch(/3\/19\/2024|3\/20\/2024/);
  });

  it('accepts Date objects', () => {
    expect(formatDate(new Date('2024-03-20T00:00:00Z'))).toMatch(/Mar 20, 2024|Mar 19, 2024/);
    // Note: timezone-dependent. The UTC midnight instant may render as the
    // previous day in western longitudes — both are valid interpretations
    // of "format the given Date."
  });
});
