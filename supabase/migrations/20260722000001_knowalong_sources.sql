-- 20260722000001_knowalong_sources.sql
--
-- Why: the source layer is the entry point for every KnowAlong workflow.
-- A user pastes media text (first vertical: song lyrics); we store the raw
-- user-provided text verbatim in learning_sources / source_sections /
-- source_lines and treat every normalized/translated/transliterated
-- derivative as a separate, visibly-labelled field. This separation is the
-- product's core safety contract: generated material must never be
-- presented as or confused with the user's pasted source text.
--
-- Data-model shape:
--   learning_sources  (1 per user)  — top-level import: title, artist,
--                                     languages, processing status.
--   source_sections   (N per source) — ordered subdivisions (verse,
--                                     chorus, bridge, …).
--   source_lines      (N per source, 0..1 section) — exact pasted line +
--                                     optional normalized/translated/
--                                     transliterated derivatives +
--                                     per-line review status.
--
-- RLS strategy:
--   learning_sources carries user_id directly and is owner-only.
--   source_sections and source_lines carry NO user_id column and gate
--   every policy via EXISTS through learning_sources.user_id. This keeps
--   the row shape lean and avoids a denormalized user_id that could drift
--   out of sync with the owning source.

-- =============================================================================
-- learning_sources
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.learning_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'lyrics'
    CHECK (source_type IN ('lyrics')),
  title text NOT NULL,
  artist text,
  target_language text NOT NULL,
  translation_language text NOT NULL DEFAULT 'en',
  notes text,
  source_content_hash text,
  processing_status text NOT NULL DEFAULT 'draft'
    CHECK (processing_status IN ('draft', 'analyzing', 'analyzed', 'analysis_failed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_sources_user_created
  ON public.learning_sources (user_id, created_at DESC);

ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_sources_owner_select
  ON public.learning_sources FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY learning_sources_owner_insert
  ON public.learning_sources FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY learning_sources_owner_update
  ON public.learning_sources FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY learning_sources_owner_delete
  ON public.learning_sources FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.learning_sources');

COMMENT ON TABLE public.learning_sources IS 'User-pasted media imports. Owner-only via direct user_id. Source text is stored verbatim in source_lines.raw_text; derivatives live in separate fields.';
COMMENT ON COLUMN public.learning_sources.source_content_hash IS 'Advisory content hash for duplicate detection. Not unique-constrained — the same text may be imported in different language pairs.';

-- =============================================================================
-- source_sections
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  section_type text NOT NULL DEFAULT 'section'
    CHECK (section_type IN ('verse', 'chorus', 'bridge', 'intro', 'outro', 'stanza', 'section')),
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_source_sections_source
  ON public.source_sections (source_id, ordinal);

ALTER TABLE public.source_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_sections_owner_select
  ON public.source_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_sections.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_sections_owner_insert
  ON public.source_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_sections.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_sections_owner_update
  ON public.source_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_sections.source_id
        AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_sections.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_sections_owner_delete
  ON public.source_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_sections.source_id
        AND ls.user_id = auth.uid()
    )
  );

SELECT public.mark_updated_at('public.source_sections');

COMMENT ON TABLE public.source_sections IS 'Ordered subdivisions of a source (verse, chorus, …). RLS via EXISTS through learning_sources.user_id; no direct user_id column.';

-- =============================================================================
-- source_lines
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  section_id uuid
    REFERENCES public.source_sections(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  raw_text text NOT NULL,
  normalized_text text,
  translation text,
  transliteration text,
  review_status text NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'seen', 'learning', 'recognized', 'mastered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_source_lines_source_ordinal
  ON public.source_lines (source_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_source_lines_section
  ON public.source_lines (section_id)
  WHERE section_id IS NOT NULL;

ALTER TABLE public.source_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_lines_owner_select
  ON public.source_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_lines.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_lines_owner_insert
  ON public.source_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_lines.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_lines_owner_update
  ON public.source_lines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_lines.source_id
        AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_lines.source_id
        AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY source_lines_owner_delete
  ON public.source_lines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sources ls
      WHERE ls.id = source_lines.source_id
        AND ls.user_id = auth.uid()
    )
  );

SELECT public.mark_updated_at('public.source_lines');

COMMENT ON TABLE public.source_lines IS 'Exact pasted source text (raw_text) + optional normalized/translated/transliterated derivatives. RLS via EXISTS through learning_sources.user_id.';
COMMENT ON COLUMN public.source_lines.raw_text IS 'Verbatim user-pasted text. Never mutated after insert.';
COMMENT ON COLUMN public.source_lines.normalized_text IS 'Normalized derivative (whitespace/case/punctuation canonicalization). Always visibly labelled as normalized, never as source.';
COMMENT ON COLUMN public.source_lines.translation IS 'User or analysis-generated translation into translation_language. Always visibly labelled, never as source.';
COMMENT ON COLUMN public.source_lines.transliteration IS 'Romanized/phonetic derivative for non-Latin scripts. Always visibly labelled, never as source.';
