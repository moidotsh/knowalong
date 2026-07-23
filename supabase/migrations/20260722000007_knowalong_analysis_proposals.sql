-- 20260722000007_knowalong_analysis_proposals.sql
--
-- Why: analysis_proposals IS the proposal-first draft layer. Every output
-- of a local-companion run lands here as a typed proposal (section /
-- segment / line_translation / token_occurrence / lemma / form /
-- morphology / grammar_pattern / concept_mapping / card / realization),
-- with review_status starting at 'pending'. The PWA persists proposals
-- as they arrive from the SSE stream; no proposal writes to a curated
-- table until the user explicitly accepts it via proposalReviewService.
-- edited_payload captures user edits during review; the original payload
-- is preserved (KnowAlong's source-vs-generated safety rule generalizes
-- to "the analysis output is never silently rewritten").
--
-- Data-model shape:
--   analysis_proposals  (N per run)  — direct user_id; FK run_id cascade.
--                                       (run_id, proposal_kind, ordinal)
--                                       is unique — the per-kind ordinal
--                                       is the stable identity.
--
-- Acceptance matrix (load-bearing, see _reports/local-analysis-clcc.md):
--   Single-row destination kinds accept to: source_sections,
--   source_lines.translation, lexical_lemmas, lexical_forms,
--   lexical_forms.morphology_summary, grammar_patterns,
--   lemma_concept_links, study_cards.
--   Deferred (no destination in this checkpoint): segment,
--   token_occurrence, realization.
--   Per-proposal independent acceptance. No all-or-nothing claim. No
--   client-side rollback mechanism. Multi-table promotion (segment +
--   source_line_segments) is NOT available in this checkpoint.
--
-- Revision trail: revision 3 (correction H) removed the false claim that
-- segment proposals could be promoted atomically; segment proposals
-- remain reviewable/editable/rejectable/exportable here but their
-- Accept is disabled pending a future approved transaction / RPC.

CREATE TABLE IF NOT EXISTS public.analysis_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_id uuid NOT NULL
    REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
  proposal_kind text NOT NULL
    CHECK (proposal_kind IN (
      'section', 'segment', 'line_translation', 'token_occurrence',
      'lemma', 'form', 'morphology', 'grammar_pattern',
      'concept_mapping', 'card', 'realization'
    )),
  ordinal integer NOT NULL,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'edited', 'rejected', 'superseded')),
  payload jsonb NOT NULL,
  edited_payload jsonb,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, proposal_kind, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_analysis_proposals_user_run_status
  ON public.analysis_proposals (user_id, run_id, review_status);

CREATE INDEX IF NOT EXISTS idx_analysis_proposals_run_kind
  ON public.analysis_proposals (run_id, proposal_kind);

CREATE INDEX IF NOT EXISTS idx_analysis_proposals_status
  ON public.analysis_proposals (review_status);

ALTER TABLE public.analysis_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY analysis_proposals_owner_select
  ON public.analysis_proposals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY analysis_proposals_owner_insert
  ON public.analysis_proposals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_proposals_owner_update
  ON public.analysis_proposals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analysis_proposals_owner_delete
  ON public.analysis_proposals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.analysis_proposals');

COMMENT ON TABLE public.analysis_proposals IS 'Proposal-first draft layer. Every companion output lands here as a typed pending proposal. No curated-table write without explicit per-proposal acceptance via proposalReviewService. edited_payload preserves the user edit while the original payload is retained.';
COMMENT ON COLUMN public.analysis_proposals.proposal_kind IS 'section/segment/line_translation/token_occurrence/lemma/form/morphology/grammar_pattern/concept_mapping/card/realization. The acceptance matrix (see ADR) defines per-kind destinations and deferred kinds.';
COMMENT ON COLUMN public.analysis_proposals.review_status IS 'pending = awaiting user review; accepted = promoted to curated table; edited = user modified via editProposal; rejected = user dismissed; superseded = replaced by an existing curated row (e.g. duplicate lemma).';
COMMENT ON COLUMN public.analysis_proposals.payload IS 'Per-kind proposal payload (typed PWA-side via AnalysisProposalPayload union). NEVER source text outside the structured fields that explicitly carry it (e.g. line_translation translation_text).';
COMMENT ON COLUMN public.analysis_proposals.ordinal IS 'Per-(run, proposal_kind) ordinal. Stable identity for dedupe across SSE replay.';
