-- 20260722000006_knowalong_analysis_runs.sql
--
-- Why: analysis_runs + analysis_events are the persistent record of every
-- local-companion analysis run (source_analysis or clcc_generation). The
-- PWA owns these writes; the companion NEVER writes to Supabase. Each run
-- is a state machine: queued -> connecting -> running -> validating ->
-- awaiting_review | failed | cancelled. There is intentionally NO
-- "succeeded" terminal state — analysis output is proposal-only and
-- always requires explicit user review (per the proposal-first safety
-- rule). analysis_events is the durable, sanitized event log the PWA
-- persists as the SSE stream is consumed; it NEVER contains source text,
-- model chain-of-thought, prompts, or tokens.
--
-- Data-model shape:
--   analysis_runs     (1 per user per run)        — direct user_id.
--                                                    Nullable source_id for
--                                                    CLCC runs that target
--                                                    a language rather than
--                                                    a specific source.
--   analysis_events   (N per run, append-only)    — direct user_id. FK
--                                                    run_id cascade.
--                                                    Deduped PWA-side by
--                                                    (run_id, ordinal).
--
-- source_run_id backfill: every analysis-derived table that needs to
-- remember which run produced it gets a `source_run_id` column pointing
-- here. To avoid forward-reference FK errors, the source_run_id columns
-- are added in migration 009 (after this table exists), NOT inline in
-- migrations 005 / 008. See migration 009 STEP B.
--
-- Revision trail: this migration is part of the local-analysis + CLCC
-- checkpoint (revision 3). Revision 2 (correction A) fixed the forward-
-- reference FK error by splitting source_run_id into a later migration;
-- revision 3 retains that fix.

-- =============================================================================
-- analysis_runs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid
    REFERENCES public.learning_sources(id) ON DELETE SET NULL,
  run_type text NOT NULL
    CHECK (run_type IN ('source_analysis', 'clcc_generation')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'connecting', 'running', 'validating', 'awaiting_review', 'failed', 'cancelled')),
  target_language_code text NOT NULL,
  model_label text,
  companion_version text,
  companion_job_id text,
  source_content_checksum varchar(64),
  source_line_count integer,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  request_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_created
  ON public.analysis_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_source_created
  ON public.analysis_runs (source_id, created_at DESC)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_runs_status
  ON public.analysis_runs (user_id, status);

ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY analysis_runs_owner_select
  ON public.analysis_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY analysis_runs_owner_insert
  ON public.analysis_runs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_runs_owner_update
  ON public.analysis_runs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_runs_owner_delete
  ON public.analysis_runs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.analysis_runs');

COMMENT ON TABLE public.analysis_runs IS 'Persistent record of a local-companion analysis run. PWA-owned writes; companion has no Supabase access. NO succeeded terminal — output is proposal-only and always requires explicit review.';
COMMENT ON COLUMN public.analysis_runs.run_type IS 'source_analysis = lyric/text analysis pipeline; clcc_generation = Core-Language-Concept-Cluster language-pack generation for fr/ru/fa.';
COMMENT ON COLUMN public.analysis_runs.status IS 'State machine: queued -> connecting -> running -> validating -> awaiting_review | failed | cancelled. NO succeeded.';
COMMENT ON COLUMN public.analysis_runs.source_id IS 'Nullable: set for source_analysis runs; NULL for CLCC runs that target a language rather than a source.';
COMMENT ON COLUMN public.analysis_runs.companion_job_id IS 'Job id returned by the local companion POST. Used to look up status, stream events, and fetch the result. NULL until the companion accepts the job.';
COMMENT ON COLUMN public.analysis_runs.source_content_checksum IS 'sha256 of the source content sent to the companion (NOT the source text itself). Used for change detection across re-runs.';
COMMENT ON COLUMN public.analysis_runs.failure_reason IS 'Specific companion error taxonomy kind on failure (companion.mixed-content-blocked, companion.unauthorized, …). NOT a generic string.';
COMMENT ON COLUMN public.analysis_runs.request_params IS 'Sanitized run parameters (model, language, options). NEVER source text, prompts, or model chain-of-thought.';
COMMENT ON COLUMN public.analysis_runs.summary IS 'Sanitized run summary (counts by proposal_kind, warnings). Persisted PWA-side at run finalization.';

-- =============================================================================
-- analysis_events (append-only; sanitized)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analysis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_id uuid NOT NULL
    REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  severity text NOT NULL
    CHECK (severity IN ('info', 'progress', 'warning', 'error', 'stage_start', 'stage_complete', 'stage_failed')),
  stage text,
  message varchar(500) NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_analysis_events_run_ordinal
  ON public.analysis_events (run_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_analysis_events_user_created
  ON public.analysis_events (user_id, created_at DESC);

ALTER TABLE public.analysis_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analysis_events_owner_select
  ON public.analysis_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY analysis_events_owner_insert
  ON public.analysis_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_events_owner_update
  ON public.analysis_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_events_owner_delete
  ON public.analysis_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- No updated_at trigger: this table is append-only.

COMMENT ON TABLE public.analysis_events IS 'Durable, sanitized event log per analysis run. Append-only. Deduped PWA-side by (run_id, ordinal). NEVER source text, prompts, tokens, or model chain-of-thought. payload carries structured per-stage progress only.';
COMMENT ON COLUMN public.analysis_events.severity IS 'info/progress/warning/error/stage_start/stage_complete/stage_failed. The stage_* severities drive the progress card UI.';
COMMENT ON COLUMN public.analysis_events.payload IS 'Sanitized structured progress data (subProgress, stageIndex, stageCount, …). NEVER source text or model chain-of-thought.';
