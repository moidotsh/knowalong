// utils/companion/credential.ts
// PWA-side storage for the companion API token. The COMPANION owns and
// generates its token; the PWA stores only a client copy. The token is
// paste-only — there is intentionally NO generateToken() here. The token
// NEVER travels in URLs, query strings, event IDs, or persisted payloads;
// it lives ONLY in the Authorization header of authenticated requests.
//
// Storage backend: SecureStore (expo-secure-store) when available, with
// an in-memory fallback for tests / SSR / demo mode. SecureStore is the
// right place for a long-lived bearer credential on-device — AsyncStorage
// is readable by any code with the storage scope.

import * as SecureStore from 'expo-secure-store';
import { logger } from '../logger';

const TOKEN_KEY = 'knowalong.companion.token';
const BASEURL_KEY = 'knowalong.companion.baseUrl';

/** Default loopback base URL. The companion binds 127.0.0.1 only. */
export const DEFAULT_COMPANION_BASE_URL = 'http://127.0.0.1:8765';

/** In-memory fallback used when SecureStore is unavailable (tests, SSR, demo). */
const memoryStore: { token?: string; baseUrl?: string } = {};

function secureStoreAvailable(): boolean {
  return (
    typeof SecureStore !== 'undefined' &&
    typeof SecureStore.getItemAsync === 'function' &&
    typeof SecureStore.setItemAsync === 'function'
  );
}

export interface CompanionCredential {
  token: string;
  baseUrl: string;
}

/** Read the saved credential, or null if none. */
export async function readCompanionCredential(): Promise<CompanionCredential | null> {
  try {
    let token: string | undefined;
    let baseUrl: string | undefined;
    if (secureStoreAvailable()) {
      token = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? undefined;
      baseUrl = (await SecureStore.getItemAsync(BASEURL_KEY)) ?? undefined;
    } else {
      token = memoryStore.token;
      baseUrl = memoryStore.baseUrl;
    }
    if (!token) return null;
    return { token, baseUrl: baseUrl || DEFAULT_COMPANION_BASE_URL };
  } catch (e) {
    logger.warn('companion', 'failed to read companion credential', e);
    return null;
  }
}

/** Persist a paste-supplied token + base URL. Validates non-empty. */
export async function writeCompanionCredential(
  token: string,
  baseUrl: string = DEFAULT_COMPANION_BASE_URL,
): Promise<void> {
  const trimmedToken = token.trim();
  const trimmedBaseUrl = baseUrl.trim();
  if (!trimmedToken) {
    // s10-exempt: caller-facing validation; the mutation handler catches and surfaces as a typed form error.
    throw new Error('Token must not be empty.');
  }
  if (!trimmedBaseUrl) {
    // s10-exempt: caller-facing validation; the mutation handler catches and surfaces as a typed form error.
    throw new Error('Base URL must not be empty.');
  }
  if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
    // s10-exempt: caller-facing validation; the mutation handler catches and surfaces as a typed form error.
    throw new Error('Base URL must include the http(s) scheme.');
  }
  if (secureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, trimmedToken);
    await SecureStore.setItemAsync(BASEURL_KEY, trimmedBaseUrl);
  } else {
    memoryStore.token = trimmedToken;
    memoryStore.baseUrl = trimmedBaseUrl;
  }
}

/** Clear the saved credential. */
export async function clearCompanionCredential(): Promise<void> {
  if (secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(BASEURL_KEY);
  } else {
    delete memoryStore.token;
    delete memoryStore.baseUrl;
  }
}

/** Test-only accessor; do NOT call from app code. */
export function __memoryCredentialForTests(): CompanionCredential | null {
  return memoryStore.token ? { ...memoryStore } as CompanionCredential : null;
}
