// constants/supabase.ts
// Supabase project coordinates. Behavior on missing env vars is split by
// environment so the shell works as a starter AND fails loudly in production:
//
//   - Development: warn once via logger and fall back to '' so the design-
//     system showcase at /dev/premium renders before Supabase is configured.
//     Auth/data flows will fail at runtime with a clear "Invalid URL" error
//     from the Supabase SDK — that's the right shape for "not set up yet."
//
//   - Production: throw at module load. A production deploy with missing
//     env is a misconfiguration that should fail at first page load, not
//     silently degrade in users' browsers.
//
// CRITICAL: Expo's bundler inlines `process.env.EXPO_PUBLIC_*` ONLY for
// static member access (literal key). Dynamic access like `process.env[key]`
// defeats the inliner — the access ships as a runtime lookup against an
// empty `process.env` in the browser, returns undefined, and the throw
// fires regardless of whether the var was set at build time. So the static
// access MUST happen at the call site (the two exports below), not inside
// the helper. The helper takes the already-resolved value as its second
// argument and only centralizes the throw/warn/return-'' boilerplate.

import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

function requiredEnv(key: string, value: string | undefined): string {
  if (value) return value;

  const message = `Missing required env var: ${key}. Arqavellum needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set in .env.local (or your host's env).`;

  if (isProduction) {
    // s10-exempt: production bundle-time fail-fast. AppError's domain
    // machinery doesn't add anything for a missing build-time env var;
    // the throw needs to fire during `expo export` so the broken deploy
    // never lands.
    throw new Error(message);
  }

  // Dev: warn and fall back. The shell showcase needs to render before
  // the consumer has configured Supabase. Auth/data flows will surface
  // a runtime error from the Supabase SDK if invoked in this state.
  logger.warn('env', `${message} — falling back to '' in dev so the showcase can render.`);
  return '';
}

// Static access at the call site so Expo's babel inliner can replace
// `process.env.EXPO_PUBLIC_*` with the build-time value. Do NOT refactor
// these into a loop or a helper that takes the key as a variable — that
// breaks inlining and the bundle ships without the value.
export const SUPABASE_URL: string = requiredEnv(
  'EXPO_PUBLIC_SUPABASE_URL',
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY: string = requiredEnv(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const SUPABASE_FUNCTIONS_URL: string = `${SUPABASE_URL}/functions/v1`;
