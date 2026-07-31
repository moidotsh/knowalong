-- Phase R1b (Studio re-orientation): carry the operator-authored paradigm
-- + cited example sentences into concept_realizations so the consumer app
-- can render gradient lessons (gradient from "apple" -> "I like apples" ->
-- "I was raised in the streets").
--
-- Both columns are nullable; existing rows stay NULL. Studio (knowalong-
-- studio) publishes these once STUDIO_PUBLISH_GRAMMAR=1 is set, which is
-- gated on this migration being applied.
--
-- Content-vs-pedagogy line (load-bearing): Studio ships operator-authored
-- + cited CONTENT verbatim and derives no pedagogical structure.
--   grammar_json  — the operator-authored paradigm (Studio's Grammar shape:
--                   {nominal?, verbal?, government?, aspect?}). The CONSUMER
--                   derives feature tags from it; Studio does not flatten a
--                   features[] list.
--   examples_json — JSON array of cited Tatoeba sentences, each
--                   {sourceText, translation, sourceCorpus, sourceAttribution}.
--                   Locked-at-publish from Studio's corpus (locked = shipped).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-applying is a no-op.

ALTER TABLE public.concept_realizations
  ADD COLUMN IF NOT EXISTS grammar_json jsonb,
  ADD COLUMN IF NOT EXISTS examples_json jsonb;

COMMENT ON COLUMN public.concept_realizations.grammar_json IS
  'Operator-authored paradigm (Studio Grammar shape). Nullable. Consumer derives feature tags; Studio ships verbatim.';
COMMENT ON COLUMN public.concept_realizations.examples_json IS
  'JSON array of cited example sentences [{sourceText, translation, sourceCorpus, sourceAttribution}]. Nullable.';
