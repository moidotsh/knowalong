// tools/local-companion/__tests__/tokenLifecycle.test.ts
// Token lifecycle: constant-time compare, length validation, no-leak.

import { describe, it, expect } from 'bun:test';
import { constantTimeEqual, checkBearer } from '../router';

describe('token lifecycle', () => {
  it('constantTimeEqual returns true for identical strings', () => {
    const a = 'a'.repeat(64);
    expect(constantTimeEqual(a, a)).toBe(true);
  });

  it('constantTimeEqual returns false for different-length strings', () => {
    expect(constantTimeEqual('a', 'aa')).toBe(false);
  });

  it('constantTimeEqual returns false for same-length but different strings', () => {
    const a = 'a'.repeat(64);
    const b = 'b'.repeat(64);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it('checkBearer rejects missing Authorization header', () => {
    const req = new Request('http://x/');
    expect(checkBearer(req, 'a'.repeat(64))).toBe(false);
  });

  it('checkBearer rejects malformed Authorization header', () => {
    const req = new Request('http://x/', { headers: { Authorization: 'Bearer' } });
    expect(checkBearer(req, 'a'.repeat(64))).toBe(false);
  });

  it('checkBearer accepts correct Bearer header', () => {
    const token = 'a'.repeat(64);
    const req = new Request('http://x/', { headers: { Authorization: `Bearer ${token}` } });
    expect(checkBearer(req, token)).toBe(true);
  });

  it('checkBearer rejects wrong token', () => {
    const req = new Request('http://x/', { headers: { Authorization: `Bearer ${'b'.repeat(64)}` } });
    expect(checkBearer(req, 'a'.repeat(64))).toBe(false);
  });
});
