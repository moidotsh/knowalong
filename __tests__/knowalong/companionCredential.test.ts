// __tests__/knowalong/companionCredential.test.ts
// PWA-side companion credential lifecycle. The PWA NEVER generates a token;
// it only stores a paste-supplied one. SecureStore is mocked to an in-memory
// map; the in-memory fallback path in credential.ts is what runs under jsdom.

import { describe, it, expect, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import * as credentialModule from '../../utils/companion/credential';
import {
  readCompanionCredential,
  writeCompanionCredential,
  clearCompanionCredential,
  __memoryCredentialForTests,
  DEFAULT_COMPANION_BASE_URL,
} from '../../utils/companion/credential';

describe('companion credential lifecycle', () => {
  beforeEach(async () => {
    // Reset the SecureStore mock backing Map AND the in-memory fallback so
    // each test starts from a clean slate regardless of which backend the
    // module resolved to.
    const store = SecureStore as unknown as { __resetForTests?: () => void };
    store.__resetForTests?.();
    await clearCompanionCredential();
  });

  it('reads null when nothing is saved', async () => {
    expect(await readCompanionCredential()).toBeNull();
  });

  it('persists a paste-supplied token + baseUrl', async () => {
    await writeCompanionCredential('a'.repeat(64), 'http://127.0.0.1:8765');
    const cred = await readCompanionCredential();
    expect(cred).not.toBeNull();
    expect(cred!.token).toBe('a'.repeat(64));
    expect(cred!.baseUrl).toBe('http://127.0.0.1:8765');
  });

  it('falls back to DEFAULT_COMPANION_BASE_URL when baseUrl is omitted', async () => {
    await writeCompanionCredential('a'.repeat(64));
    const cred = await readCompanionCredential();
    expect(cred!.baseUrl).toBe(DEFAULT_COMPANION_BASE_URL);
  });

  it('rejects an empty token (caller-facing validation)', async () => {
    await expect(writeCompanionCredential('', 'http://127.0.0.1:8765')).rejects.toThrow(/token/i);
  });

  it('rejects an empty baseUrl', async () => {
    await expect(writeCompanionCredential('a'.repeat(64), '')).rejects.toThrow(/base url/i);
  });

  it('rejects a baseUrl without an http(s) scheme', async () => {
    await expect(writeCompanionCredential('a'.repeat(64), '127.0.0.1:8765')).rejects.toThrow(/scheme/i);
  });

  it('clears the credential', async () => {
    await writeCompanionCredential('a'.repeat(64));
    await clearCompanionCredential();
    expect(await readCompanionCredential()).toBeNull();
    expect(__memoryCredentialForTests()).toBeNull();
  });

  it('does NOT expose any token-generation function (companion owns the token)', () => {
    // PWA-side: there must be NO generateToken / rotateToken / newToken function.
    // The token travels exclusively in the Authorization header, sourced from
    // the persisted client copy.
    expect((credentialModule as Record<string, unknown>).generateToken).toBeUndefined();
    expect((credentialModule as Record<string, unknown>).rotateToken).toBeUndefined();
    expect((credentialModule as Record<string, unknown>).newToken).toBeUndefined();
  });

  it('trims whitespace from pasted values', async () => {
    await writeCompanionCredential('  ' + 'a'.repeat(64) + '  ', '  http://127.0.0.1:8765  ');
    const cred = await readCompanionCredential();
    expect(cred!.token).toBe('a'.repeat(64));
    expect(cred!.baseUrl).toBe('http://127.0.0.1:8765');
  });
});
