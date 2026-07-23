-- 00000000000000_rpc_telemetry.sql
-- RPC-outcome telemetry table. Arqavellum ships this as a starter migration so
-- consumers get a working track-rpc edge function on first deploy without
-- having to design the schema. Run this once per Supabase project.
--
-- Why: the `withRpcTelemetry(rpc, actorId, fn)` wrapper in
-- `utils/supabase/rpcTelemetry.ts` emits one event per wrapped RPC call.
-- The edge function at `supabase/functions/track-rpc/index.ts` accepts those
-- events (allowlisted RPC names only) and inserts them here via the service
-- role. The signal is pre-consent and ad-blocker-surviving — it answers
-- "did this call land?" and "if not, why?" without depending on a
-- consent-gated analytics pipeline.
--
-- `actor_id` is intentionally generic. Consumers can pass whatever stable
-- id their domain uses (user_id, device_id, anonymous_id, or null for
-- pre-session calls).
--
-- RLS: deny-all. No anon or authenticated policies. Inserts happen via the
-- service-role key in the edge function, which bypasses RLS. Consumers must
-- NOT add anon/authenticated INSERT policies to this table — that would
-- open a public write path to a table the edge function rate-limits and
-- allowlists on input.

CREATE TABLE IF NOT EXISTS public.rpc_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  rpc text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'error')),
  duration_ms integer,
  error_type text,
  error_message text,
  user_agent text,
  country_code text,
  region text,
  app_version text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rpc_telemetry ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rpc_telemetry IS 'Pre-consent, fire-and-forget RPC-outcome log. Written by the track-rpc edge function (service role). Deny-all RLS — service-role bypass only. Allowlist + rate limit live in the edge function.';

COMMENT ON COLUMN public.rpc_telemetry.actor_id IS 'Generic analytics identifier (consumer-defined — user_id, device_id, anonymous_id). Nullable so pre-session calls can still log.';

COMMENT ON COLUMN public.rpc_telemetry.error_message IS 'Truncated to 500 chars at the edge function. May contain PostgREST error strings; never contains user payload (only the RPC name is shipped, not the params).';
