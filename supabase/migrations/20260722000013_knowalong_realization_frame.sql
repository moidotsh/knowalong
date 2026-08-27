-- 20260722000013_knowalong_realization_frame.sql
--
-- The Construction Frame column (Studio 2026-08 redesign): the unit of
-- content ships with the row. A frame is the full form-meaning pairing
-- a learner must acquire — valency slots with morphological marking,
-- case government, the contrast set the surface participates in, and
-- L1-interference notes anticipating learner errors.
--
-- Studio stores it as frame_json on corpus_realizations and ships it
-- through the publish mapper alongside grammar_json (the paradigm the
-- CONSUMER derives features from). The distinction:
--   grammar_json = the paradigm table (what forms exist)
--   frame_json   = the construction claim (how the forms combine:
--                  «нравиться» takes a DAT experiencer + NOM theme)
--
-- The consumer uses frames to (a) assemble lessons that teach the
-- construction rather than the isolated word, (b) show interference
-- notes ("English speakers say *я нравится — the experiencer is
-- dative"), and (c) verify example sentences instantiate the frame
-- before using them as practice material.

ALTER TABLE public.concept_realizations
  ADD COLUMN IF NOT EXISTS frame_json jsonb;

COMMENT ON COLUMN public.concept_realizations.frame_json IS
  'Construction Frame (Studio 2026-08): { slots: [{role, features[], obligatory, fillerHint?}], government: [{features[], adposition?}], contrastSet?: {axis, variants[], statement}, interferenceNotes: [{l1, note}] }. Null for rows predating frames. The linguistic unit the consumer teaches with — see Studio lib/frames/types.ts for the canonical schema.';
