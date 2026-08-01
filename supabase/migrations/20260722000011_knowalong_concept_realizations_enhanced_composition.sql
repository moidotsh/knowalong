-- 20260722000011_knowalong_concept_realizations_enhanced_composition.sql
--
-- Adds the Phase E1 enhanced fields + Phase 2 composition metadata to
-- concept_realizations. These are the columns Studio's publish mapper
-- produces (LearnerRealizationRow shape); the consumer reads them for:
--   - ipa: pronunciation display on flashcards
--   - frequency_rank: basal/difficulty ordering
--   - transliteration: romanization for non-Latin-script languages
--   - prerequisites: the CLCC dependency graph (which concepts the learner
--     should know first) — lets the consumer assemble gradient + lyric-
--     section lessons from known CLCCs
--   - enables: the reverse edge (which concepts this one unlocks)
--
-- All columns are nullable / default-empty; existing rows are unaffected.
-- Studio sends these when STUDIO_PUBLISH_ENHANCED=1 (or local target); the
-- consumer gracefully handles NULLs (no pronunciation, no ordering signal,
-- no composition metadata → flat lesson sequence).
--
-- There is no live Supabase yet — this migration is DRAFTED, not applied.
-- When the Supabase project is provisioned, this migration runs alongside
-- the others (Supabase applies them in timestamp order).

ALTER TABLE public.concept_realizations
  ADD COLUMN IF NOT EXISTS ipa text,
  ADD COLUMN IF NOT EXISTS frequency_rank integer,
  ADD COLUMN IF NOT EXISTS transliteration text,
  ADD COLUMN IF NOT EXISTS prerequisites jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enables jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.concept_realizations.ipa IS
  'IPA pronunciation (Phase E1). Null when no reference IPA data. Studio normalizes via lib/ipa/.';
COMMENT ON COLUMN public.concept_realizations.frequency_rank IS
  'Corpus frequency rank, 1 = most frequent (Phase E1). Null when no frequency pack. The consumer''s basal/difficulty ordering signal.';
COMMENT ON COLUMN public.concept_realizations.transliteration IS
  'Romanization (BGN/PCGN etc.) for non-Latin-script languages (Phase E1). Null for Latin-script languages.';
COMMENT ON COLUMN public.concept_realizations.prerequisites IS
  'CLCC dependency graph: concept codes the learner should know BEFORE this one (Phase 2). JSON array of strings, e.g. ["EXIST", "HERE"]. Empty array when no graph is authored. The consumer uses this to assemble gradient + lyric-section lessons from known CLCCs.';
COMMENT ON COLUMN public.concept_realizations.enables IS
  'CLCC dependency graph: concept codes this one unlocks (Phase 2, the reverse edge). JSON array of strings. Empty array when no graph is authored.';
