-- 20260722000004_knowalong_study_readiness.sql
--
-- Why: the study + readiness layer connects the source lexicon to spaced
-- review and to the readiness score that tells a learner how prepared they
-- are for a given source or section. Cards are the atomic review unit;
-- review_states and review_attempts track scheduling and history;
-- source_readiness_snapshots persist the pure-function readiness result so
-- the UI does not recompute on every render.
--
-- Data-model shape:
--   study_cards                  (1 per user per card)
--                                — the atomic review unit. Flexible target
--                                FKs let a card quote a source_line (exact
--                                source), reference a lemma/concept
--                                (generated practice), or both.
--   review_states                (1 per card, cascade)
--                                — provisional scheduler columns (not full
--                                FSRS). RLS via EXISTS through study_cards.
--   review_attempts              (N per card per user)
--                                — the review history. Owner-only.
--   source_readiness_snapshots   (N per source/section per user)
--                                — persisted readiness score + components.
--                                Owner-only.
--
-- Source-card safety (load-bearing):
--   The CHECK constraints on study_cards encode the product's core
--   distinction — source-derived material and generated practice are
--   queryable and visibly separate. A card that quotes or clozes exact
--   source text MUST reference a source_line_id. A generated_transfer card
--   MUST be generated_content = true and MUST target at least one lemma or
--   concept. Every non-generated card MUST reference at least its source_id.
--   These are CHECK constraints (not triggers) so they hold at every write
--   path and can be inspected via \d+ for query planning.

-- =============================================================================
-- study_cards
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.study_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_kind text NOT NULL
    CHECK (card_kind IN ('source_recognition', 'source_production', 'source_cloze', 'generated_transfer')),
  generated_content boolean NOT NULL DEFAULT false,
  source_id uuid
    REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  source_section_id uuid
    REFERENCES public.source_sections(id) ON DELETE CASCADE,
  source_line_id uuid
    REFERENCES public.source_lines(id) ON DELETE CASCADE,
  lexical_lemma_id uuid
    REFERENCES public.lexical_lemmas(id) ON DELETE SET NULL,
  target_core_concept_id uuid
    REFERENCES public.core_concepts(id) ON DELETE SET NULL,
  target_realization_id uuid
    REFERENCES public.concept_realizations(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  answer text NOT NULL,
  context_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Source-derived cards cannot be generated_content = true.
  -- (generated_transfer is the only generated card_kind.)
  CHECK (
    (generated_content = false)
    OR
    (card_kind = 'generated_transfer')
  ),

  -- generated_transfer MUST be generated_content = true AND target at least
  -- one lemma / concept / realization.
  CHECK (
    (card_kind <> 'generated_transfer')
    OR
    (generated_content = true AND (
       lexical_lemma_id IS NOT NULL
       OR target_core_concept_id IS NOT NULL
       OR target_realization_id IS NOT NULL
    ))
  ),

  -- Cards that quote or cloze exact source text MUST reference a source_line_id.
  CHECK (
    (card_kind NOT IN ('source_recognition', 'source_production', 'source_cloze'))
    OR
    (source_line_id IS NOT NULL)
  ),

  -- Every non-generated card MUST reference at least its source_id.
  CHECK (
    (generated_content = true)
    OR
    (source_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_study_cards_user_created
  ON public.study_cards (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_cards_source
  ON public.study_cards (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_section
  ON public.study_cards (source_section_id)
  WHERE source_section_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_line
  ON public.study_cards (source_line_id)
  WHERE source_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_lemma
  ON public.study_cards (lexical_lemma_id)
  WHERE lexical_lemma_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_cards_generated
  ON public.study_cards (user_id, generated_content);

ALTER TABLE public.study_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY study_cards_owner_select
  ON public.study_cards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY study_cards_owner_insert
  ON public.study_cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY study_cards_owner_update
  ON public.study_cards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY study_cards_owner_delete
  ON public.study_cards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.study_cards');

COMMENT ON TABLE public.study_cards IS 'Atomic review units. Flexible target FKs encode provenance: source-derived cards quote source_line text; generated_transfer cards reference a lemma/concept target. CHECK constraints keep source vs generated visibly queryable.';
COMMENT ON COLUMN public.study_cards.generated_content IS 'true = generated practice (never presented as source); false = source-derived. Drives the source-vs-generated safety split.';
COMMENT ON COLUMN public.study_cards.card_kind IS 'source_recognition/source_production/source_cloze quote exact source text (require source_line_id). generated_transfer is AI-constructed practice referencing a lemma/concept target.';

-- =============================================================================
-- review_states
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.review_states (
  card_id uuid PRIMARY KEY
    REFERENCES public.study_cards(id) ON DELETE CASCADE,
  card_status text NOT NULL DEFAULT 'new'
    CHECK (card_status IN ('new', 'learning', 'review', 'young', 'mature')),
  due_at timestamptz,
  interval_days numeric,
  ease_factor numeric,
  repetitions integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_states_due
  ON public.review_states (due_at)
  WHERE due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_states_status
  ON public.review_states (card_status);

ALTER TABLE public.review_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_states_owner_select
  ON public.review_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_cards sc
      WHERE sc.id = review_states.card_id
        AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY review_states_owner_insert
  ON public.review_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_cards sc
      WHERE sc.id = review_states.card_id
        AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY review_states_owner_update
  ON public.review_states FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_cards sc
      WHERE sc.id = review_states.card_id
        AND sc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_cards sc
      WHERE sc.id = review_states.card_id
        AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY review_states_owner_delete
  ON public.review_states FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_cards sc
      WHERE sc.id = review_states.card_id
        AND sc.user_id = auth.uid()
    )
  );

SELECT public.mark_updated_at('public.review_states');

COMMENT ON TABLE public.review_states IS 'Provisional scheduler state per card. RLS via EXISTS through study_cards.user_id; no direct user_id column. Columns are a provisional seam (not full FSRS) — interval_days/ease_factor are nullable until a scheduler is wired.';

-- =============================================================================
-- review_attempts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.review_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL
    REFERENCES public.study_cards(id) ON DELETE CASCADE,
  rating text NOT NULL
    CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  time_spent_ms integer
);

CREATE INDEX IF NOT EXISTS idx_review_attempts_user_card_time
  ON public.review_attempts (user_id, card_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_attempts_user_time
  ON public.review_attempts (user_id, reviewed_at DESC);

ALTER TABLE public.review_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_attempts_owner_select
  ON public.review_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY review_attempts_owner_insert
  ON public.review_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY review_attempts_owner_update
  ON public.review_attempts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY review_attempts_owner_delete
  ON public.review_attempts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.review_attempts IS 'Review history. Owner-only via direct user_id. rating is the four-level FSRS-style input (again/hard/good/easy).';

-- =============================================================================
-- source_readiness_snapshots
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_readiness_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL
    REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  section_id uuid
    REFERENCES public.source_sections(id) ON DELETE CASCADE,
  readiness_score numeric NOT NULL
    CHECK (readiness_score BETWEEN 0 AND 100),
  version text NOT NULL,
  components jsonb NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_readiness_snapshots_user_source_time
  ON public.source_readiness_snapshots (user_id, source_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_readiness_snapshots_user_section_time
  ON public.source_readiness_snapshots (user_id, source_id, section_id, calculated_at DESC)
  WHERE section_id IS NOT NULL;

ALTER TABLE public.source_readiness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_readiness_snapshots_owner_select
  ON public.source_readiness_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY source_readiness_snapshots_owner_insert
  ON public.source_readiness_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY source_readiness_snapshots_owner_update
  ON public.source_readiness_snapshots FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY source_readiness_snapshots_owner_delete
  ON public.source_readiness_snapshots FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.source_readiness_snapshots IS 'Persisted readiness score per source (or section). Owner-only via direct user_id. version pins the calculation formula; components carries the weighted breakdown.';
COMMENT ON COLUMN public.source_readiness_snapshots.section_id IS 'NULL = source-level snapshot; set = section-level snapshot.';
COMMENT ON COLUMN public.source_readiness_snapshots.components IS 'JSON array of {code, label, weight, raw, contribution} entries mirroring ReadinessComponent. The caller owns the schema.';
