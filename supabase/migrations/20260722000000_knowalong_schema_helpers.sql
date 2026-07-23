-- 20260722000000_knowalong_schema_helpers.sql
--
-- Why: every KnowAlong table that allows updates carries an `updated_at`
-- column. Centralizing the trigger function + a one-call trigger-builder
-- here avoids copy-pasting the same `BEFORE UPDATE` boilerplate into every
-- table migration and keeps the per-table file focused on schema + RLS.
--
-- What ships here:
--   1. public.set_updated_at() — the no-arg trigger function that sets
--      NEW.updated_at = now(). Created OR REPLACE so re-running is safe.
--   2. public.mark_updated_at(target regclass) — a helper that drops any
--      existing `set_updated_at_<table>` trigger on the target and creates
--      a fresh BEFORE UPDATE trigger. Idempotent; safe to call from later
--      migrations and on re-apply.
--
-- No tables live in this file. Every table migration that needs updated_at
-- calls `SELECT public.mark_updated_at('public.<table>');` after CREATE TABLE.
--
-- The starter shell ships only `00000000000000_rpc_telemetry.sql` (no
-- updated_at helper), so this file is the canonical source of the helper.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_updated_at(target regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  trigger_name text;
BEGIN
  trigger_name := 'set_updated_at_' || replace(target::text, '.', '_');
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, target);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
    trigger_name,
    target
  );
END;
$$;
