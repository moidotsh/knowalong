-- 20260722000009_knowalong_study_cards_extensions.sql
--
-- Why: this migration extends study_cards with the source-segment context
-- link, the grammar_pattern target column (the 4th and final
-- generated-transfer target), the difficulty_budget / provenance /
-- source_run_id columns, AND backfills the source_run_id column on every
-- analysis-derived table created earlier (source_segments in 005,
-- lexical_senses / grammar_patterns / lemma_concept_links in 008).
-- It also replaces exactly one of the four existing CHECK constraints on
-- study_cards so that generated_transfer cards can target a grammar
-- pattern in addition to lemma / Core Concept / realization.
--
-- Constraint name (load-bearing, Gate 1 inspection result):
--   Phase 0 inspection of `pg_constraint` on a scratch DB (migrations
--   000-004 applied cleanly) confirmed the literal name of the CHECK
--   whose definition contains `(card_kind <> 'generated_transfer'::text)`
--   is `study_cards_check1`. This is the second inline-unnamed table-
--   level CHECK on study_cards in migration 00004 (the first is
--   `study_cards_check`, the third is `study_cards_check2`, the fourth
--   is `study_cards_check3`; the column-level CHECK on card_kind becomes
--   `study_cards_card_kind_check` and is untouched here).
--   Phase 0 SQL:
--     SELECT conname, pg_get_constraintdef(oid)
--     FROM pg_constraint
--     WHERE conrelid = 'public.study_cards'::regclass AND contype = 'c'
--     ORDER BY conname;
--   Result row:
--     study_cards_check1 | CHECK (((card_kind <> 'generated_transfer'::text)
--                             OR ((generated_content = true) AND
--                                 ((lexical_lemma_id IS NOT NULL) OR
--                                  (target_core_concept_id IS NOT NULL) OR
--                                  (target_realization_id IS NOT NULL)))))
--   If the actual local DB shows a different name, the editor MUST
--   substitute it below verbatim before running this migration. If the
--   constraint cannot be identified uniquely, STOP — do not run this
--   migration. The IF EXISTS guard tolerates a no-op rename but is NOT a
--   substitute for Phase 0 inspection.
--
-- STEP C uses the literal name only — NO dynamic DO block, NO text-
-- pattern matching in the migration SQL (revision 3 correction L).
--
-- Revision trail: this migration is part of the local-analysis + CLCC
-- checkpoint (revision 3). Revision 2 (correction A) added source_run_id
-- here instead of inline in 005/008 to avoid a forward-reference FK;
-- revision 3 (correction I) narrowed the generated-transfer target set
-- to lemma / Core Concept / realization / grammar_pattern ONLY (form is
-- NOT a target); revision 3 (correction L) replaced the dynamic DO
-- discovery with the Phase 0 literal name.

-- =============================================================================
-- STEP A — extend study_cards with new columns
-- =============================================================================

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS source_segment_id uuid
    REFERENCES public.source_segments(id) ON DELETE SET NULL;

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS grammar_pattern_id uuid
    REFERENCES public.grammar_patterns(id) ON DELETE SET NULL;

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS difficulty_budget jsonb;

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS provenance varchar(32)
    CHECK (provenance IS NULL OR provenance IN ('manual', 'source_analysis', 'clcc_generation'));

ALTER TABLE public.study_cards
  ADD COLUMN IF NOT EXISTS source_run_id uuid
    REFERENCES public.analysis_runs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.study_cards.source_segment_id IS 'Context-only link to a source segment. Does NOT satisfy the generated_transfer target requirement (acceptance matrix).';
COMMENT ON COLUMN public.study_cards.grammar_pattern_id IS 'Fourth generated_transfer target column (acceptance matrix: lemma / Core Concept / realization / grammar_pattern). Form is NOT a target in this checkpoint.';
COMMENT ON COLUMN public.study_cards.difficulty_budget IS 'Structured difficulty allocation for generated cards (target count, unknown-target cap). Enforced by transferPolicyService.';
COMMENT ON COLUMN public.study_cards.provenance IS 'manual / source_analysis / clcc_generation. NULL for cards created before this column existed.';
COMMENT ON COLUMN public.study_cards.source_run_id IS 'The analysis_run that produced this card (when analysis-derived). SET NULL on run deletion so accepted curated cards survive run cleanup.';

-- =============================================================================
-- STEP B — backfill source_run_id on every analysis-derived table now
-- that analysis_runs (006) exists. Each column is nullable + SET NULL on
-- delete so accepted curated rows survive their producing run's deletion.
-- =============================================================================

ALTER TABLE public.source_segments
  ADD COLUMN IF NOT EXISTS source_run_id uuid
    REFERENCES public.analysis_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_source_segments_run
  ON public.source_segments (source_run_id)
  WHERE source_run_id IS NOT NULL;

ALTER TABLE public.lexical_senses
  ADD COLUMN IF NOT EXISTS source_run_id uuid
    REFERENCES public.analysis_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lexical_senses_run
  ON public.lexical_senses (source_run_id)
  WHERE source_run_id IS NOT NULL;

ALTER TABLE public.grammar_patterns
  ADD COLUMN IF NOT EXISTS source_run_id uuid
    REFERENCES public.analysis_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_run
  ON public.grammar_patterns (source_run_id)
  WHERE source_run_id IS NOT NULL;

ALTER TABLE public.lemma_concept_links
  ADD COLUMN IF NOT EXISTS source_run_id uuid
    REFERENCES public.analysis_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lemma_concept_links_run
  ON public.lemma_concept_links (source_run_id)
  WHERE source_run_id IS NOT NULL;

COMMENT ON COLUMN public.source_segments.source_run_id IS 'The analysis_run that produced this segment. SET NULL on run deletion so segments reviewed/edited/exported survive run cleanup.';
COMMENT ON COLUMN public.lexical_senses.source_run_id IS 'The analysis_run that produced this sense. SET NULL on run deletion.';
COMMENT ON COLUMN public.grammar_patterns.source_run_id IS 'The analysis_run that produced this pattern. SET NULL on run deletion.';
COMMENT ON COLUMN public.lemma_concept_links.source_run_id IS 'The analysis_run that produced this link. SET NULL on run deletion.';

-- =============================================================================
-- STEP C — targeted constraint migration on study_cards
-- Drops study_cards_check1 (Phase 0 literal name) and replaces it with
-- study_cards_generated_transfer_target_check whose predicate accepts
-- grammar_pattern_id as a fourth target column. The other three existing
-- table-level CHECKs (study_cards_check, study_cards_check2,
-- study_cards_check3) and the column-level study_cards_card_kind_check
-- stay UNTOUCHED.
-- =============================================================================

ALTER TABLE public.study_cards
  DROP CONSTRAINT IF EXISTS study_cards_check1;

ALTER TABLE public.study_cards
  ADD CONSTRAINT study_cards_generated_transfer_target_check
  CHECK (
    (card_kind <> 'generated_transfer')
    OR
    (generated_content = true AND (
       lexical_lemma_id IS NOT NULL
       OR target_core_concept_id IS NOT NULL
       OR target_realization_id IS NOT NULL
       OR grammar_pattern_id IS NOT NULL
    ))
  );

-- =============================================================================
-- STEP D — new study_cards indexes (with IF NOT EXISTS)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_study_cards_segment
  ON public.study_cards (source_segment_id)
  WHERE source_segment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_grammar_pattern
  ON public.study_cards (grammar_pattern_id)
  WHERE grammar_pattern_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_run
  ON public.study_cards (source_run_id)
  WHERE source_run_id IS NOT NULL;
