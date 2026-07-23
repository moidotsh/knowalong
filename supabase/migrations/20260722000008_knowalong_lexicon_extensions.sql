-- 20260722000008_knowalong_lexicon_extensions.sql
--
-- Why: lexical_senses / grammar_patterns / lemma_concept_links /
-- token_occurrence_senses extend the lexicon with the
-- analysis-attribution layer the local-companion populates. These are
-- the destinations (or partial destinations) for several proposal kinds
-- in the acceptance matrix: sense proposals land in lexical_senses;
-- grammar_pattern proposals land in grammar_patterns; concept_mapping
-- proposals land in lemma_concept_links. token_occurrence_senses is a
-- pure link table.
--
-- source_run_id backfill: every analysis-derived table here gets a
-- source_run_id column pointing to analysis_runs. To avoid a forward-
-- reference FK error (analysis_runs is created in migration 006, this
-- migration runs after 006 so the FK would technically be valid here),
-- we still defer the source_run_id column to migration 009 STEP B for
-- consistency with source_segments (005) and to keep the backfill
-- centralized. See migration 009 STEP B.
--
-- Revision trail: revision 2 (correction A) fixed the FK ordering by
-- deferring source_run_id to 009; revision 3 retains that fix.

-- =============================================================================
-- lexical_senses
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lexical_senses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lemma_id uuid NOT NULL
    REFERENCES public.lexical_lemmas(id) ON DELETE CASCADE,
  sense_kind text NOT NULL
    CHECK (sense_kind IN ('core', 'contextual', 'idiomatic')),
  gloss text NOT NULL,
  definition_target_language varchar(8) NOT NULL DEFAULT 'en',
  example_text text,
  confidence real
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence_provenance text NOT NULL DEFAULT 'manual'
    CHECK (evidence_provenance IN ('source_line', 'source_section', 'generated_analysis', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lemma_id, gloss, definition_target_language)
);

CREATE INDEX IF NOT EXISTS idx_lexical_senses_user_lemma
  ON public.lexical_senses (user_id, lemma_id);

CREATE INDEX IF NOT EXISTS idx_lexical_senses_kind
  ON public.lexical_senses (user_id, sense_kind);

ALTER TABLE public.lexical_senses ENABLE ROW LEVEL SECURITY;

CREATE POLICY lexical_senses_owner_select
  ON public.lexical_senses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY lexical_senses_owner_insert
  ON public.lexical_senses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lexical_senses_owner_update
  ON public.lexical_senses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lexical_senses_owner_delete
  ON public.lexical_senses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.lexical_senses');

COMMENT ON TABLE public.lexical_senses IS 'Per-lemma sense entries (core/contextual/idiomatic). Owner-only via direct user_id. Destination for sense proposals (acceptance matrix).';
COMMENT ON COLUMN public.lexical_senses.confidence IS 'Companion confidence in [0,1] when generated; NULL for manual.';
COMMENT ON COLUMN public.lexical_senses.evidence_provenance IS 'Where this sense was derived from: source_line, source_section, generated_analysis, or manual. Mirrors EvidenceProvenance enum.';

-- =============================================================================
-- grammar_patterns
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.grammar_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid
    REFERENCES public.learning_sources(id) ON DELETE SET NULL,
  source_section_id uuid
    REFERENCES public.source_sections(id) ON DELETE SET NULL,
  source_segment_id uuid
    REFERENCES public.source_segments(id) ON DELETE SET NULL,
  target_core_concept_id uuid
    REFERENCES public.core_concepts(id) ON DELETE SET NULL,
  target_lemma_id uuid
    REFERENCES public.lexical_lemmas(id) ON DELETE SET NULL,
  pattern_code text NOT NULL,
  pattern_label text NOT NULL,
  explanation text,
  example_source_text text,
  example_target_text text,
  confidence real
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence_provenance text NOT NULL DEFAULT 'generated_analysis'
    CHECK (evidence_provenance IN ('source_line', 'source_section', 'generated_analysis', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_user_source
  ON public.grammar_patterns (user_id, source_id);

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_concept
  ON public.grammar_patterns (target_core_concept_id)
  WHERE target_core_concept_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_lemma
  ON public.grammar_patterns (target_lemma_id)
  WHERE target_lemma_id IS NOT NULL;

ALTER TABLE public.grammar_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY grammar_patterns_owner_select
  ON public.grammar_patterns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY grammar_patterns_owner_insert
  ON public.grammar_patterns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY grammar_patterns_owner_update
  ON public.grammar_patterns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY grammar_patterns_owner_delete
  ON public.grammar_patterns FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.grammar_patterns');

COMMENT ON TABLE public.grammar_patterns IS 'Grammar patterns observed in a source or proposed by analysis. Owner-only via direct user_id. A generated_transfer card may target a grammar_pattern (acceptance matrix — see migration 009 STEP C).';
COMMENT ON COLUMN public.grammar_patterns.target_core_concept_id IS 'Optional link to the Core Concept this pattern most realizes. Core Concepts are seeded (migration 00003) and never client-created.';

-- =============================================================================
-- lemma_concept_links
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lemma_concept_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lemma_id uuid NOT NULL
    REFERENCES public.lexical_lemmas(id) ON DELETE CASCADE,
  core_concept_id uuid NOT NULL
    REFERENCES public.core_concepts(id) ON DELETE CASCADE,
  realization_note text,
  confidence real
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence_provenance text NOT NULL DEFAULT 'generated_analysis'
    CHECK (evidence_provenance IN ('source_line', 'source_section', 'generated_analysis', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lemma_id, core_concept_id)
);

CREATE INDEX IF NOT EXISTS idx_lemma_concept_links_user_lemma
  ON public.lemma_concept_links (user_id, lemma_id);

CREATE INDEX IF NOT EXISTS idx_lemma_concept_links_concept
  ON public.lemma_concept_links (core_concept_id);

ALTER TABLE public.lemma_concept_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY lemma_concept_links_owner_select
  ON public.lemma_concept_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY lemma_concept_links_owner_insert
  ON public.lemma_concept_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lemma_concept_links_owner_update
  ON public.lemma_concept_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lemma_concept_links_owner_delete
  ON public.lemma_concept_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.lemma_concept_links');

COMMENT ON TABLE public.lemma_concept_links IS 'Per-user mapping from a lexical lemma to a Core Concept. Owner-only. Destination for concept_mapping proposals (acceptance matrix). NEVER creates a new canonical Core Concept — concept_mapping Accept requires the Core Concept to already exist.';

-- =============================================================================
-- token_occurrence_senses (link table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.token_occurrence_senses (
  token_occurrence_id uuid NOT NULL
    REFERENCES public.token_occurrences(id) ON DELETE CASCADE,
  sense_id uuid NOT NULL
    REFERENCES public.lexical_senses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token_occurrence_id, sense_id)
);

CREATE INDEX IF NOT EXISTS idx_token_occurrence_senses_token
  ON public.token_occurrence_senses (token_occurrence_id);

CREATE INDEX IF NOT EXISTS idx_token_occurrence_senses_sense
  ON public.token_occurrence_senses (sense_id);

ALTER TABLE public.token_occurrence_senses ENABLE ROW LEVEL SECURITY;

-- RLS via EXISTS through both parents (token_occurrences has no direct
-- user_id; resolve through its source_line -> learning_sources.user_id
-- AND lexical_senses.user_id).
CREATE POLICY token_occurrence_senses_owner_select
  ON public.token_occurrence_senses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.token_occurrences toc
      JOIN public.source_lines sl ON sl.id = toc.source_line_id
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE toc.id = token_occurrence_senses.token_occurrence_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.lexical_senses ls2
      WHERE ls2.id = token_occurrence_senses.sense_id
        AND ls2.user_id = auth.uid()
    )
  );

CREATE POLICY token_occurrence_senses_owner_insert
  ON public.token_occurrence_senses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.token_occurrences toc
      JOIN public.source_lines sl ON sl.id = toc.source_line_id
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE toc.id = token_occurrence_senses.token_occurrence_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.lexical_senses ls2
      WHERE ls2.id = token_occurrence_senses.sense_id
        AND ls2.user_id = auth.uid()
    )
  );

CREATE POLICY token_occurrence_senses_owner_delete
  ON public.token_occurrence_senses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.token_occurrences toc
      JOIN public.source_lines sl ON sl.id = toc.source_line_id
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE toc.id = token_occurrence_senses.token_occurrence_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.lexical_senses ls2
      WHERE ls2.id = token_occurrence_senses.sense_id
        AND ls2.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.token_occurrence_senses IS 'Link table: which senses apply to which token occurrences. RLS via EXISTS through both parents.';
