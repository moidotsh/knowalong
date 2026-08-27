-- 20260722000012_knowalong_realization_publish_conflict_target.sql
--
-- Partial unique index for Studio's publish upsert.
--
-- KnowAlong Studio (the sibling admin product) publishes authoritative
-- CLCC realizations with user_id = NULL (global, operator-authored rows)
-- via a service-role upsert:
--
--     INSERT ... ON CONFLICT (core_concept_id, language_code) DO UPDATE
--
-- That ON CONFLICT clause requires a matching unique constraint on the
-- consumer side; Postgres rejects the statement with SQLSTATE 42P10
-- otherwise. The base schema indexes (core_concept_id), (language_code)
-- non-uniquely, and the only table-level UNIQUE lives on
-- learner_concept_progress — so the publish path could never succeed
-- against this schema (2026-08 audit finding).
--
-- A PARTIAL index (WHERE user_id IS NULL) is the correct shape:
--   - it covers exactly the rows Studio owns (global published rows);
--   - it leaves user-owned rows (user_id NOT NULL) unconstrained, so
--     per-user realizations stay append- and dedupe-friendly under the
--     repository layer's own rules;
--   - it keeps ON CONFLICT target inference unambiguous for the
--     service-role path (which always writes user_id = NULL).

CREATE UNIQUE INDEX IF NOT EXISTS uq_concept_realizations_published
  ON public.concept_realizations (core_concept_id, language_code)
  WHERE user_id IS NULL;

COMMENT ON INDEX public.uq_concept_realizations_published IS
  'Conflict target for Studio publish upserts: exactly one global (user_id IS NULL) realization per (concept, language). User-owned rows are unconstrained by this index.';
