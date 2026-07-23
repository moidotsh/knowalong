// utils/supabase/rpcTelemetry.ts
// Fire-and-forget RPC-outcome telemetry wrapper.
//
// Emits one event per wrapped RPC call to /functions/v1/track-rpc, capturing
// outcome (success/error), duration, and a truncated error message — enough
// to answer "did this call land?" and "if not, why?" without depending on
// a consent-gated analytics pipeline.
//
// Contract:
//   - Transparent: returns exactly what the wrapped fn() returns (R). Callers
//     (the repository methods) keep their existing signatures, types, and
//     error handling — wrapping is a one-line change at the call site.
//   - Silent: no logger calls. The caller already logs RPC errors with full
//     context; double-logging would just duplicate.
//   - Fire-and-forget: telemetry POST is kicked off but never awaited.
//     Failures (network, ad-blocker, 5xx) are swallowed. The wrapper must
//     not introduce a new failure mode for the RPC it wraps.
//   - S8: uses fetchWithRetry rather than raw fetch, so the structural lint
//     rule stays clean.
//
// Arqavellum ships the full system: this wrapper + the edge function at
// `supabase/functions/track-rpc/index.ts` + the table defined in
// `supabase/migrations/00000000000000_rpc_telemetry.sql`. The edge function
// ships with an EMPTY allowlist — consumers add entries as they wrap
// repository methods (see "Enabling RPC telemetry" in `CLAUDE.md`).

import { fetchWithRetry } from '../api-client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants';

const ENDPOINT = `${SUPABASE_URL}/functions/v1/track-rpc`;
const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 1; // single attempt — no retry. Telemetry is best-effort.

function detectPlatform(): string {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return 'native';
  if (typeof window !== 'undefined') return 'web';
  return 'unknown';
}

const PLATFORM = detectPlatform();

/**
 * Wrap a Supabase RPC call with fire-and-forget outcome telemetry.
 *
 * Usage in repository methods:
 *   const { data, error } = await withRpcTelemetry(
 *     'upsert_something',
 *     actorId,
 *     () => supabase.rpc('upsert_something', params),
 *   );
 *
 * The wrapper:
 *   1. Awaits the RPC and captures outcome + duration.
 *   2. POSTs a telemetry event to /functions/v1/track-rpc (never awaited
 *      inside the wrapper; failures swallowed).
 *   3. Returns the original result so the caller's error handling is
 *      unaffected.
 *
 * `actorId` is intentionally generic — pass whatever stable identifier your
 * domain uses (user_id, device_id, anonymous_id, null for pre-session calls).
 *
 * Note on `PromiseLike<R>`: supabase's `.rpc()` returns a
 * `PostgrestFilterBuilder` which is thenable (has `then`) but not a real
 * `Promise` (no `catch`/`finally` on the builder itself). Using
 * `PromiseLike<R>` lets the constraint accept both real Promises and
 * supabase builders without forcing callers to wrap with `Promise.resolve`.
 */
export async function withRpcTelemetry<R extends { data: unknown; error: { message: string } | null }>(
  rpc: string,
  actorId: string | null | undefined,
  fn: () => PromiseLike<R>,
): Promise<R> {
  const start = Date.now();
  let outcome: 'success' | 'error' = 'success';
  let errorMessage: string | undefined;

  try {
    const result = await fn();
    if (result.error) {
      outcome = 'error';
      errorMessage = String(result.error.message).slice(0, 500);
    }
    return result;
  } catch (e) {
    outcome = 'error';
    errorMessage = String((e as { message?: string })?.message ?? e).slice(0, 500);
    throw e;
  } finally {
    const payload = {
      rpc,
      outcome,
      duration_ms: Date.now() - start,
      error_type: outcome === 'error' ? (errorMessage ? 'RPC_ERROR' : 'EXCEPTION') : null,
      error_message: errorMessage,
      actor_id: actorId ?? null,
      platform: PLATFORM,
    };

    // Fire-and-forget. Never await — the wrapper's caller doesn't care
    // whether telemetry landed. Swallow every rejection so a broken
    // network can't propagate into the RPC's own behavior.
    fetchWithRetry(
      ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS,
      MAX_ATTEMPTS,
    ).catch(() => {
      /* swallowed — see contract */
    });
  }
}
