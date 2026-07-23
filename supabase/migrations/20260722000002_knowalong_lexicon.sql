-- 20260722000002_knowalong_lexicon.sql
--
-- Why: the lexicon layer is the per-user vocabulary graph that connects
-- the user's pasted source text to reusable linguistic knowledge. Tokens
-- observed in source lines resolve to surface forms, which resolve to
-- lemmas. This three-level chain (token_occurrence → lexical_form →
-- lexical_lemma) keeps the provenance explicit: a lemma is never just
-- "known" — it is always grounded in specific lines the user has pasted.
--
-- Data-model shape:
--   lexical_lemmas     (1 per user+language+lemma+POS) — dictionary head
--                       entries with optional grammar metadata.
--   lexical_forms      (N per lemma)                   — inflected surface
--                       forms with morphology summary.
--   token_occurrences  (N per source_line, 0..1 form)  — exact positions in
--                       source text, linked to a form when resolved.
--
-- RLS strategy:
--   lexical_lemmas carries user_id directly and is owner-only.
--   lexical_forms and token_occurrences carry NO user_id column and gate
--   via EXISTS through their parent's owner. token_occurrences reaches two
--   levels up (source_line → learning_sources.user_id) so a token is
--   visible iff the owning source is visible.
--
-- token_occurrences.lexical_form_id uses ON DELETE SET NULL: deleting a
-- form does not erase the occurrence in the source text — it just unlinks
-- the analysis. This is why this table ships after lexical_forms.

-- =============================================================================
-- lexical_lemmas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lexical_lemmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  normalized_lemma text NOT NULL,
  part_of_speech text NOT NULL,
  primary_gloss text,
  grammatical_gender text
    CHECK (grammatical_gender IS NULL OR grammatical_gender IN ('masculine', 'feminine', 'neuter', 'common')),
  animacy text
    CHECK (animacy IS NULL OR animacy IN ('animate', 'inanimate')),
  verb_aspect text
    CHECK (verb_aspect IS NULL OR verb_aspect IN ('perfective', 'imperfective', 'biaspectual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_code, normalized_lemma, part_of_speech)
);

CREATE INDEX IF NOT EXISTS idx_lexical_lemmas_user_lang
  ON public.lexical_lemmas (user_id, language_code);

ALTER TABLE public.lexical_lemmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY lexical_lemmas_owner_select
  ON public.lexical_lemmas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY lexical_lemmas_owner_insert
  ON public.lexical_lemmas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lexical_lemmas_owner_update
  ON public.lexical_lemmas FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY lexical_lemmas_owner_delete
  ON public.lexical_lemmas FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.lexical_lemmas');

COMMENT ON TABLE public.lexical_lemmas IS 'Per-user dictionary head entries. Owner-only via direct user_id. Grammar metadata columns are nullable and advisory (encountered, not complete paradigms).';
COMMENT ON COLUMN public.lexical_lemmas.grammatical_gender IS 'Advisory gender observed in user content. Nullable: not every language marks gender, and a lemma may not have been observed in a gendered form yet.';

-- =============================================================================
-- lexical_forms
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lexical_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma_id uuid NOT NULL
    REFERENCES public.lexical_lemmas(id) ON DELETE CASCADE,
  surface_form text NOT NULL,
  morphology_summary text,
  grammatical_case text
    CHECK (grammatical_case IS NULL OR grammatical_case IN ('nominative', 'accusative', 'genitive', 'dative', 'instrumental', 'prepositional', 'locative', 'vocative', 'ablative')),
  grammatical_number text
    CHECK (grammatical_number IS NULL OR grammatical_number IN ('singular', 'plural', 'dual')),
  grammatical_person text
    CHECK (grammatical_person IS NULL OR grammatical_person IN ('1', '2', '3')),
  tense text
    CHECK (tense IS NULL OR tense IN ('present', 'past', 'future')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lexical_forms_lemma
  ON public.lexical_forms (lemma_id);

CREATE INDEX IF NOT EXISTS idx_lexical_forms_surface
  ON public.lexical_forms (surface_form);

ALTER TABLE public.lexical_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY lexical_forms_owner_select
  ON public.lexical_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lexical_lemmas ll
      WHERE ll.id = lexical_forms.lemma_id
        AND ll.user_id = auth.uid()
    )
  );

CREATE POLICY lexical_forms_owner_insert
  ON public.lexical_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lexical_lemmas ll
      WHERE ll.id = lexical_forms.lemma_id
        AND ll.user_id = auth.uid()
    )
  );

CREATE POLICY lexical_forms_owner_update
  ON public.lexical_forms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lexical_lemmas ll
      WHERE ll.id = lexical_forms.lemma_id
        AND ll.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lexical_lemmas ll
      WHERE ll.id = lexical_forms.lemma_id
        AND ll.user_id = auth.uid()
    )
  );

CREATE POLICY lexical_forms_owner_delete
  ON public.lexical_forms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lexical_lemmas ll
      WHERE ll.id = lexical_forms.lemma_id
        AND ll.user_id = auth.uid()
    )
  );

SELECT public.mark_updated_at('public.lexical_forms');

COMMENT ON TABLE public.lexical_forms IS 'Inflected surface forms per lemma. RLS via EXISTS through lexical_lemmas.user_id; no direct user_id column. Morphology columns are nullable (forms encountered in the user library, not a complete inflection table).';

-- =============================================================================
-- token_occurrences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.token_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_line_id uuid NOT NULL
    REFERENCES public.source_lines(id) ON DELETE CASCADE,
  lexical_form_id uuid
    REFERENCES public.lexical_forms(id) ON DELETE SET NULL,
  ordinal integer NOT NULL,
  surface_token text NOT NULL,
  char_start integer,
  char_end integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_line_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_token_occurrences_line
  ON public.token_occurrences (source_line_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_token_occurrences_form
  ON public.token_occurrences (lexical_form_id)
  WHERE lexical_form_id IS NOT NULL;

ALTER TABLE public.token_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_occurrences_owner_select
  ON public.token_occurrences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = token_occurrences.source_line_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY token_occurrences_owner_insert
  ON public.token_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = token_occurrences.source_line_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY token_occurrences_owner_update
  ON public.token_occurrences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = token_occurrences.source_line_id
        AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = token_occurrences.source_line_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY token_occurrences_owner_delete
  ON public.token_occurrences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = token_occurrences.source_line_id
        AND ls.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.token_occurrences IS 'Exact token positions in source text, optionally linked to a resolved lexical_form. RLS via EXISTS two levels up (source_line → learning_sources.user_id). lexical_form_id ON DELETE SET NULL preserves the occurrence when a form is deleted.';
COMMENT ON COLUMN public.token_occurrences.surface_token IS 'Verbatim token from source text. Never mutated after insert.';
