-- 20260722000005_knowalong_source_segments.sql
--
-- Why: source_segments and source_line_segments carry the analysis-derived
-- segmentation of a user's pasted source text into linguistic units
-- (sentences, clauses, phrases, refrain fragments, …). A segment may span
-- one or many source_lines; the ordered source_line_segments rows are the
-- SOLE authoritative span representation. source_segments carries the
-- assembled display text + checksum as derived reconstruction-integrity
-- values. There are deliberately NO source-level start_offset / end_offset
-- columns on source_segments — two competing span systems invited
-- ambiguity, so the per-line link table is the only span source of truth.
--
-- Promotion status (load-bearing):
--   These tables ship in this checkpoint so segment proposals are
--   reviewable, editable, rejectable, and exportable. Segment proposal
--   PROMOTION (writing segment + line-span rows from the UI) is DEFERRED.
--   The schema exists so a future approved transaction / RPC can write to
--   it without another migration. There is intentionally NO companion
--   repository write method on sourceSegmentRepository in this checkpoint.
--
-- Data-model shape:
--   source_segments        (1 per user per segment)
--                          — direct user_id; owner-only RLS. source-level
--                          ordinal (unique per source). assembled_display_text
--                          is the deterministic reconstruction of the
--                          ordered source_line_segments rows; the checksum
--                          guards against drift.
--   source_line_segments   (N per segment; the authoritative span)
--                          — link table between source_lines and
--                          source_segments. RLS via EXISTS through BOTH
--                          parents. start_offset / end_offset are per-line
--                          offsets into source_lines.raw_text (nullable
--                          when the link represents the whole line).
--
-- Revision trail: this migration is part of the local-analysis + CLCC
-- checkpoint (revision 3). Revision 3 removed source-level start/end
-- offsets from source_segments (correction J) so the per-line link table
-- is the sole authoritative span.

-- =============================================================================
-- source_segments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL
    REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  source_section_id uuid
    REFERENCES public.source_sections(id) ON DELETE SET NULL,
  ordinal integer NOT NULL,
  segment_kind text NOT NULL
    CHECK (segment_kind IN ('sentence', 'clause', 'phrase', 'refrain_fragment', 'annotation', 'other')),
  assembled_display_text text NOT NULL,
  display_text_checksum varchar(64) NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_source_segments_user_source_ordinal
  ON public.source_segments (user_id, source_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_source_segments_section
  ON public.source_segments (source_section_id)
  WHERE source_section_id IS NOT NULL;

ALTER TABLE public.source_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_segments_owner_select
  ON public.source_segments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY source_segments_owner_insert
  ON public.source_segments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY source_segments_owner_update
  ON public.source_segments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY source_segments_owner_delete
  ON public.source_segments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.source_segments');

COMMENT ON TABLE public.source_segments IS 'Analysis-derived linguistic segments (sentence/clause/phrase/…). Owner-only via direct user_id. assembled_display_text is the deterministic reconstruction of the ordered source_line_segments rows; display_text_checksum guards against drift. NOTE: segment promotion from the UI is deferred in this checkpoint — schema exists for review/edit/export and future atomic promotion.';
COMMENT ON COLUMN public.source_segments.ordinal IS 'Source-level ordinal (unique per source). Distinct from source_line_segments.ordinal which is position-within-segment.';
COMMENT ON COLUMN public.source_segments.assembled_display_text IS 'Deterministic reconstruction of the ordered source_line_segments.line_fragment (or full source_lines.raw_text when line_fragment IS NULL) joined by newline. Must match display_text_checksum.';
COMMENT ON COLUMN public.source_segments.display_text_checksum IS 'sha256(assembled_display_text). Reconstruction integrity guard.';
COMMENT ON COLUMN public.source_segments.segment_kind IS 'sentence/clause/phrase/refrain_fragment/annotation/other. Distinct from source_sections.section_type (verse/chorus/bridge/…).';

-- =============================================================================
-- source_line_segments (the authoritative span — multi-line aware)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_line_segments (
  source_line_id uuid NOT NULL
    REFERENCES public.source_lines(id) ON DELETE CASCADE,
  source_segment_id uuid NOT NULL
    REFERENCES public.source_segments(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  start_offset integer,
  end_offset integer,
  line_fragment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_line_id, source_segment_id),
  UNIQUE (source_segment_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_source_line_segments_line
  ON public.source_line_segments (source_line_id);

CREATE INDEX IF NOT EXISTS idx_source_line_segments_segment_ordinal
  ON public.source_line_segments (source_segment_id, ordinal);

ALTER TABLE public.source_line_segments ENABLE ROW LEVEL SECURITY;

-- RLS via EXISTS through BOTH parents: the owning source_line's source user
-- AND the owning source_segment's user must both match auth.uid(). This
-- prevents a segment owned by user A from being linked to a line owned by
-- user B (which would otherwise leak line text across users).
CREATE POLICY source_line_segments_owner_select
  ON public.source_line_segments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = source_line_segments.source_line_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.source_segments sg
      WHERE sg.id = source_line_segments.source_segment_id
        AND sg.user_id = auth.uid()
    )
  );

CREATE POLICY source_line_segments_owner_insert
  ON public.source_line_segments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = source_line_segments.source_line_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.source_segments sg
      WHERE sg.id = source_line_segments.source_segment_id
        AND sg.user_id = auth.uid()
    )
  );

CREATE POLICY source_line_segments_owner_update
  ON public.source_line_segments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = source_line_segments.source_line_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.source_segments sg
      WHERE sg.id = source_line_segments.source_segment_id
        AND sg.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = source_line_segments.source_line_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.source_segments sg
      WHERE sg.id = source_line_segments.source_segment_id
        AND sg.user_id = auth.uid()
    )
  );

CREATE POLICY source_line_segments_owner_delete
  ON public.source_line_segments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.source_lines sl
      JOIN public.learning_sources ls ON ls.id = sl.source_id
      WHERE sl.id = source_line_segments.source_line_id
        AND ls.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.source_segments sg
      WHERE sg.id = source_line_segments.source_segment_id
        AND sg.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.source_line_segments IS 'Sole authoritative span representation for a segment. Multi-line aware: a segment spans N lines via N rows here. start_offset/end_offset are char offsets into THIS line raw_text (nullable when the link represents the whole line). line_fragment is the exact substring (nullable when whole line). RLS via EXISTS through BOTH parents.';
COMMENT ON COLUMN public.source_line_segments.ordinal IS 'Position within the segment (1..N). Source-level ordering is on source_segments.ordinal; this is per-segment line order.';
COMMENT ON COLUMN public.source_line_segments.start_offset IS 'Char offset into source_lines.raw_text. Validation: 0 <= start_offset <= end_offset <= length(raw_text). Enforced PWA-side before insert; segments failing validation are rejected.';
