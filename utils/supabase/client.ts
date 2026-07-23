// utils/supabase/client.ts
// Singleton Supabase client. Arqavellum's only direct `@supabase/supabase-js`
// import site — every other consumer goes through this module or via
// repositories (S9). Wraps `fetch` with a 15s AbortController timeout so
// a cold-start DNS/TLS stall or network blip can't hang the UI forever.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants';

// 15-second safety net on every Supabase HTTP call (RPC, auth, storage).
// Mirrors the AbortController pattern in utils/api-client.ts:fetchWithRetry.
// Long enough for legitimate slow requests (token refresh, cold Edge
// Function starts); short enough to surface "something is wrong" before
// the user gives up.
const SUPABASE_FETCH_TIMEOUT_MS = 15000;

// Cast as `typeof fetch` so the wrapper satisfies Next.js's fetch type
// augmentation. Supabase never calls preconnect; the cast is shape-
// preserving on the call signature.
const supabaseFetch = ((url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}) as typeof fetch;

// Dev-mode placeholder for unconfigured Supabase env vars. The Supabase JS
// SDK rejects empty strings at `createClient` construction with
// "supabaseUrl is required", which would crash the design-system showcase
// at /dev/premium before the consumer has set up their project. In
// production, `constants/supabase.ts` throws at module load (bundle time)
// so this branch is unreachable there. In dev, we substitute a non-empty
// placeholder that passes SDK validation; any auth/data call will surface
// a clear "Invalid URL" error from the SDK at runtime if invoked in this
// state — that's the right shape for "not set up yet."
const UNCONFIGURED_URL = 'https://placeholder.supabase.co';
const UNCONFIGURED_KEY = 'placeholder-anon-key';

const resolvedUrl = SUPABASE_URL || UNCONFIGURED_URL;
const resolvedKey = SUPABASE_ANON_KEY || UNCONFIGURED_KEY;

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: supabaseFetch,
  },
});

export default supabase;
