// supabase/functions/track-rpc/index.ts
// Pre-consent, fire-and-forget RPC-outcome telemetry.
//
// Background: see migration `supabase/migrations/00000000000000_rpc_telemetry.sql`.
// The client wrapper at `utils/supabase/rpcTelemetry.ts` emits one event per
// wrapped RPC call here, capturing outcome (success/error), duration, and a
// truncated error message — enough to answer "did this call land?" and "if
// not, why?" without depending on a consent-gated analytics pipeline. The
// endpoint must work pre-consent and survive ad-blockers (the Edge Function
// path demonstrably does both — same reason `track-rpc` was chosen over a
// consent-gated analytics path).
//
// Abuse model:
//   - Body is allowlisted to known RPC names. Random strings 400. Arqavellum
//     ships with an EMPTY allowlist — consumers add entries as they wrap
//     repository methods. Until entries are added, every POST 400s back
//     (the wrapper swallows the failure silently; this is the desired
//     "disabled by default" behavior).
//   - Rate limited per IP at 60/min in-memory (cold-start resets —
//     acceptable for a telemetry endpoint).
//   - No params or user payload accepted. Only
//     `{ rpc, outcome, duration_ms, error_type, error_message, actor_id,
//        app_version, platform }`.
//   - error_message is truncated to 500 chars here, regardless of client input.
//   - Inserts via service role; the table has deny-all RLS for anon/authenticated.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseServiceClient } from '../_shared/supabase-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { resolveGeoFromIp } from '../_shared/geo-lookup.ts';

// Allowed RPC names. **Arqavellum ships empty** — consumers populate this set
// as they wrap repository methods in `withRpcTelemetry`. Unknown names are
// rejected with 400; this is defense against the endpoint becoming a
// generic junk-drawer for arbitrary string logs.
//
// Allowlist-sync discipline: every RPC you wrap on the client side MUST be
// added here, or the edge function will silently 400 every event for that
// RPC (the wrapper swallows the failure, so you'll see it as "no telemetry
// rows for this RPC" rather than as a client-side error). Add the entry in
// the same commit that adds the `withRpcTelemetry` wrap.
//
// Example (consumer-side):
//   const ALLOWED_RPCS = new Set([
//     'upsert_user_profile',
//     'get_user_settings',
//     // ...add one per wrapped RPC
//   ]);
const ALLOWED_RPCS = new Set<string>([
  // consumers add entries here
]);

// In-memory per-IP rate limit. Resets on cold start. 60/min matches the
// granularity of typical app RPC call patterns (each user action fires a
// handful of RPCs; even a power user rarely exceeds 60/min sustained).
const RATE_LIMIT_PER_MIN = 60;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_PER_MIN;
}

interface TelemetryBody {
  rpc?: unknown;
  outcome?: unknown;
  duration_ms?: unknown;
  error_type?: unknown;
  error_message?: unknown;
  actor_id?: unknown;
  app_version?: unknown;
  platform?: unknown;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function truncate(v: unknown, max: number): string | null {
  if (!isString(v) || v.length === 0) return null;
  return v.length > max ? v.slice(0, max) : v;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  // Per-IP rate limit. `x-forwarded-for` is the standard Supabase edge
  // header; `x-real-ip` is the fallback some proxies set.
  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (rateLimited(clientIP)) {
    return new Response(null, { status: 429, headers: corsHeaders });
  }

  let body: TelemetryBody;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  if (!isString(body.rpc) || !ALLOWED_RPCS.has(body.rpc)) {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  if (body.outcome !== 'success' && body.outcome !== 'error') {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  const clientResult = await createSupabaseServiceClient({ loggerTag: 'track-rpc' });
  if (!clientResult.ok) return clientResult.errorResponse;
  const supabase = clientResult.client;

  // Coarse geo from IP — best-effort, never throws.
  const geo = await resolveGeoFromIp(clientIP);

  const row = {
    rpc: body.rpc,
    outcome: body.outcome,
    duration_ms: typeof body.duration_ms === 'number'
      ? Math.max(0, Math.min(body.duration_ms | 0, 86_400_000)) // clamp to [0, 24h] in ms
      : null,
    error_type: truncate(body.error_type, 80),
    error_message: truncate(body.error_message, 500),
    actor_id: isString(body.actor_id) && body.actor_id.length > 0
      ? body.actor_id
      : null,
    user_agent: truncate(req.headers.get('user-agent'), 300),
    app_version: truncate(body.app_version, 40),
    platform: truncate(body.platform, 20),
    country_code: geo.country_code,
    region: geo.region,
  };

  // Fire-and-forget insert. We never block on a telemetry failure — the
  // client also doesn't await our response, and a DB hiccup here must not
  // propagate as a 500 that triggers retry behavior on the client.
  try {
    await supabase.from('rpc_telemetry').insert(row);
  } catch (e) {
    console.error('[track-rpc] insert failed:', e);
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
