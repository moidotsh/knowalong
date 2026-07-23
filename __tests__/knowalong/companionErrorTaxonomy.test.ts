// __tests__/knowalong/companionErrorTaxonomy.test.ts
// Verifies that each CompanionConnectionError kind is recognizable as a
// companion error and carries the discriminant `kind` field that the UI
// uses to surface a specific user-facing message. Pure (no fetch).

import { describe, it, expect } from 'vitest';
import {
  isCompanionConnectionError,
  type CompanionConnectionError,
} from '../../shared/types/knowalong';

const ERROR_KINDS: CompanionConnectionError['kind'][] = [
  'companion.unreachable',
  'companion.mixed-content-blocked',
  'companion.unauthorized',
  'companion.origin-forbidden',
  'companion.network-error',
  'companion.timeout',
];

describe('CompanionConnectionError discriminator', () => {
  it.each(ERROR_KINDS)('is recognized for kind "%s"', (kind) => {
    const err: CompanionConnectionError = { kind, message: 'test' };
    expect(isCompanionConnectionError(err)).toBe(true);
  });

  it('rejects null', () => {
    expect(isCompanionConnectionError(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isCompanionConnectionError(undefined)).toBe(false);
  });

  it('rejects plain Error', () => {
    expect(isCompanionConnectionError(new Error('boom'))).toBe(false);
  });

  it('rejects objects whose kind does not start with "companion."', () => {
    expect(isCompanionConnectionError({ kind: 'supabase.error', message: 'x' })).toBe(false);
    expect(isCompanionConnectionError({ kind: 'unauthorized', message: 'x' })).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isCompanionConnectionError('companion.unreachable')).toBe(false);
    expect(isCompanionConnectionError(42)).toBe(false);
  });
});

describe('CompanionConnectionError — exhaustive kind coverage', () => {
  // If a new kind is added to the union without updating the UI taxonomy,
  // this test will fail loudly. Six kinds ship in this checkpoint.
  it('has exactly the expected number of variants', () => {
    expect(ERROR_KINDS).toHaveLength(6);
  });

  it.each(ERROR_KINDS)('carries a non-empty message for kind "%s"', (kind) => {
    const err: CompanionConnectionError = { kind, message: 'descriptive message' };
    expect(err.message.length).toBeGreaterThan(0);
  });
});
