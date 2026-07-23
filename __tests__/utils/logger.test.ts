// __tests__/utils/logger.test.ts
//
// Unit tests for the best-effort credential redactor in utils/logger.ts.
//
// Scope: verifies that the common credential shapes are scrubbed from
// logged strings and that benign strings pass through unchanged. The
// redactor is a hygiene measure, NOT a security boundary — see the
// file header in utils/logger.ts for the caller rule and limitations.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redactString, redactUnknown, logger } from '../../utils/logger';

describe('redactString — positive cases (credentials redacted)', () => {
  it('redacts Authorization Bearer header', () => {
    expect(redactString('Authorization: Bearer abc.def.ghi-jwt')).toBe(
      'Authorization: Bearer [REDACTED]',
    );
  });

  it('redacts Authorization Basic header', () => {
    expect(redactString('Authorization: Basic dXNlcjpwYXNz')).toBe(
      'Authorization: Basic [REDACTED]',
    );
  });

  it('redacts Authorization Digest header', () => {
    expect(redactString('Authorization: Digest nonce=xyz')).toBe(
      'Authorization: Digest [REDACTED]',
    );
  });

  it('redacts standalone Bearer token', () => {
    expect(redactString('Token: bearer abc123xyz')).toBe('Token: bearer [REDACTED]');
  });

  it('redacts password=value pair', () => {
    expect(redactString('password=hunter2')).toBe('password=[REDACTED]');
  });

  it('redacts passwd=value pair', () => {
    expect(redactString('passwd=hunter2')).toBe('passwd=[REDACTED]');
  });

  it('redacts apikey=value pair', () => {
    expect(redactString('apikey=live_sk_12345')).toBe('apikey=[REDACTED]');
  });

  it('redacts api_key=value pair (underscore variant)', () => {
    expect(redactString('api_key=live_sk_12345')).toBe('api_key=[REDACTED]');
  });

  it('redacts client_secret=value pair', () => {
    expect(redactString('client_secret=shhh')).toBe('client_secret=[REDACTED]');
  });

  it('redacts access_token=value pair', () => {
    expect(redactString('access_token=eyJ0eXAiOiJKV1Q')).toBe('access_token=[REDACTED]');
  });

  it('redacts refresh_token=value pair', () => {
    expect(redactString('refresh_token=rt_987654321')).toBe('refresh_token=[REDACTED]');
  });

  it('redacts secret=value pair', () => {
    expect(redactString('secret=donotshare')).toBe('secret=[REDACTED]');
  });

  it('redacts token=value pair', () => {
    expect(redactString('token=abc123')).toBe('token=[REDACTED]');
  });

  it('redacts JWT-shaped standalone string', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4f';
    expect(redactString(jwt)).toBe('[REDACTED_JWT]');
  });

  it('redacts JWT embedded in a longer string', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4f';
    expect(redactString(`Session JWT ${jwt} is active`)).toBe(
      'Session JWT [REDACTED_JWT] is active',
    );
  });

  it('redacts multiple credentials in one string', () => {
    expect(
      redactString('password=hunter2 apikey=live_sk_12345 token=xyz'),
    ).toBe('password=[REDACTED] apikey=[REDACTED] token=[REDACTED]');
  });

  it('handles URL-query-style credential leakage', () => {
    expect(
      redactString('https://example.com/login?access_token=eyJ0eXAi'),
    ).toBe('https://example.com/login?access_token=[REDACTED]');
  });

  it('is case-insensitive on key names', () => {
    expect(redactString('PASSWORD=Hunter2!')).toBe('PASSWORD=[REDACTED]');
    expect(redactString('APIKey=abc')).toBe('APIKey=[REDACTED]');
  });
});

describe('redactString — negative cases (benign strings unchanged)', () => {
  it('passes through a plain message', () => {
    expect(redactString('User logged in: user_123')).toBe('User logged in: user_123');
  });

  it('does not match "passwordless" as a credential', () => {
    // The pattern requires `=` after the keyword. `passwordless` has no `=`.
    expect(redactString('Enabled passwordless login')).toBe('Enabled passwordless login');
  });

  it('does not redact email= pair (email is not in the credential list)', () => {
    expect(redactString('email=user@example.com')).toBe('email=user@example.com');
  });

  it('does not redact user_id= pair', () => {
    expect(redactString('user_id=42')).toBe('user_id=42');
  });

  it('does not redact arbitrary equal-sign text', () => {
    expect(redactString('1+1=2')).toBe('1+1=2');
  });

  it('preserves empty string', () => {
    expect(redactString('')).toBe('');
  });

  it('preserves strings that look like JWTs but are not', () => {
    // Only two segments separated by a single dot — not a JWT.
    expect(redactString('eyJhbGciOiJIUzI1NiJ9.someOtherSegment')).toBe(
      'eyJhbGciOiJIUzI1NiJ9.someOtherSegment',
    );
  });
});

describe('redactUnknown — non-string pass-through', () => {
  it('returns numbers unchanged', () => {
    expect(redactUnknown(42)).toBe(42);
  });

  it('returns booleans unchanged', () => {
    expect(redactUnknown(true)).toBe(true);
  });

  it('returns null unchanged', () => {
    expect(redactUnknown(null)).toBe(null);
  });

  it('returns undefined unchanged', () => {
    expect(redactUnknown(undefined)).toBe(undefined);
  });

  it('returns plain objects unchanged (caller-rule scope)', () => {
    const obj = { password: 'hunter2', count: 3 };
    // Per design: object properties are NOT recursively scrubbed.
    expect(redactUnknown(obj)).toBe(obj);
  });

  it('returns arrays unchanged', () => {
    const arr = ['password=hunter2', 42];
    // Per design: arrays are objects; pass through. Individual strings
    // inside are not redacted at this layer.
    expect(redactUnknown(arr)).toBe(arr);
  });
});

describe('redactUnknown — Error redaction', () => {
  it('returns an Error with redacted message', () => {
    const original = new Error('Authorization: Bearer abc.def.ghi');
    const result = redactUnknown(original) as Error;
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Authorization: Bearer [REDACTED]');
  });

  it('preserves Error.name', () => {
    const original = new TypeError('password=hunter2');
    original.name = 'TypeError';
    const result = redactUnknown(original) as Error;
    expect(result.name).toBe('TypeError');
  });

  it('redacts Error.stack contents', () => {
    const original = new Error('boom');
    original.stack = 'at foo (password=hunter2)';
    const result = redactUnknown(original) as Error;
    expect(result.stack).toBe('at foo (password=[REDACTED])');
  });

  it('does not mutate the original Error', () => {
    const original = new Error('Authorization: Bearer abc.def.ghi');
    redactUnknown(original);
    expect(original.message).toBe('Authorization: Bearer abc.def.ghi');
  });

  it('drops Error.cause (does not pass through)', () => {
    const cause = new Error('upstream password=hunter2');
    const original = new Error('wrapper', { cause });
    const result = redactUnknown(original) as Error;
    expect((result as Error & { cause?: unknown }).cause).toBeUndefined();
  });
});

describe('logger — end-to-end redaction', () => {
  // Capture console.* without the spy triggering the redactor twice.
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('redacts the message parameter on logger.warn', () => {
    logger.warn('auth', 'login failed password=hunter2');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const rendered = consoleWarnSpy.mock.calls[0][0] as string;
    expect(rendered).toContain('password=[REDACTED]');
    expect(rendered).not.toContain('hunter2');
  });

  it('redacts credential-bearing Error passed to logger.error', () => {
    const err = new Error('Authorization: Bearer leak.here.now');
    logger.error('api', 'request failed', err);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const renderedMessage = consoleErrorSpy.mock.calls[0][0] as string;
    const renderedErrMessage = consoleErrorSpy.mock.calls[0][1] as string;
    expect(renderedMessage).toContain('[API]');
    expect(renderedErrMessage).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts credential-bearing string args on logger.debug', () => {
    // Force debug on so the call isn't short-circuited.
    logger.setLogLevel('debug');
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('api', 'request body', 'Authorization: Basic dXNlcjpwYXNz');
    const renderedArg = consoleLogSpy.mock.calls[0][1] as string;
    expect(renderedArg).toBe('Authorization: Basic [REDACTED]');
    logger.setLogLevel('warn'); // restore
  });
});
