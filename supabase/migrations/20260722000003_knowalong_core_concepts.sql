-- 20260722000003_knowalong_core_concepts.sql
--
-- Why: the Core Concept framework is the cross-language backbone that lets
-- KnowAlong reason about what a learner has encountered without assuming
-- any specific grammar, word order, or inflection system. Core concepts
-- are language-neutral functions (FIRST_PERSON, EXIST, GO, NEGATION, …)
-- organized into tiers by universality. A learner's progress is tracked
-- per concept per language, and per-concept realizations (the actual
-- surface words/phrases in a specific language) are either curated global
-- (NULL user_id, read-only) or user-owned (learner evidence collected
-- from their library).
--
-- Data-model shape:
--   core_concepts              (no owner, authenticated read-only)
--                              — the seeded neutral catalog (~40 Core 0–2
--                              codes). No client writes.
--   concept_realizations      (user_id NULL = curated global,
--                              user_id set = owner-only)
--                              — per-language surface forms for a concept.
--   learner_concept_progress  (direct user_id, owner-only)
--                              — the learner's evidence level per concept
--                              per language.
--
-- RLS strategy:
--   core_concepts: USING (true) FOR SELECT to authenticated; no write
--   policies. The catalog is seeded here and is not client-writable.
--
--   concept_realizations: SELECT splits — NULL user_id (curated global)
--   is readable by all authenticated; user_id = auth.uid() is
--   owner-readable. INSERT/UPDATE/DELETE are owner-only (user_id must
--   equal auth.uid()); curated global rows are never client-writable.
--
--   learner_concept_progress: owner-only via direct user_id.
--
-- Realizations are a runtime/user-owned concept. This migration seeds
-- ONLY the neutral concept catalog — no language-specific realizations,
-- no source content, no lyrics.

-- =============================================================================
-- core_concepts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.core_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  canonical_label text NOT NULL,
  description text,
  functional_cluster text NOT NULL,
  tier integer NOT NULL CHECK (tier BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_concepts_tier
  ON public.core_concepts (tier);

CREATE INDEX IF NOT EXISTS idx_core_concepts_cluster
  ON public.core_concepts (functional_cluster);

ALTER TABLE public.core_concepts ENABLE ROW LEVEL SECURITY;

-- Authenticated read-only. No INSERT/UPDATE/DELETE policies — the catalog
-- is seeded here and managed only via migrations.
CREATE POLICY core_concepts_authenticated_read
  ON public.core_concepts FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.core_concepts IS 'Language-neutral concept catalog. Authenticated read-only; no client writes. Seeded by migration; managed only via migrations.';
COMMENT ON COLUMN public.core_concepts.tier IS '0 = most universal (pronouns, existence, negation), 3 = most specific. Core 0–2 are seeded here.';

-- =============================================================================
-- concept_realizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.concept_realizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  core_concept_id uuid NOT NULL
    REFERENCES public.core_concepts(id) ON DELETE CASCADE,
  user_id uuid,
  language_code text NOT NULL,
  realization_type text NOT NULL
    CHECK (realization_type IN ('word', 'phrase', 'construction', 'feature', 'morpheme')),
  surface_form text NOT NULL,
  gloss text,
  grammatical_note text,
  lemma_id uuid
    REFERENCES public.lexical_lemmas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_realizations_concept_lang
  ON public.concept_realizations (core_concept_id, language_code);

CREATE INDEX IF NOT EXISTS idx_concept_realizations_user
  ON public.concept_realizations (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_concept_realizations_global
  ON public.concept_realizations (core_concept_id, language_code)
  WHERE user_id IS NULL;

ALTER TABLE public.concept_realizations ENABLE ROW LEVEL SECURITY;

-- SELECT: curated global (user_id IS NULL) readable by all authenticated;
-- user-owned (user_id = auth.uid()) owner-readable.
CREATE POLICY concept_realizations_read_global
  ON public.concept_realizations FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

CREATE POLICY concept_realizations_read_owner
  ON public.concept_realizations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: owner-only. A realization MUST carry the caller's
-- user_id — curated global rows are never client-writable.
CREATE POLICY concept_realizations_owner_insert
  ON public.concept_realizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY concept_realizations_owner_update
  ON public.concept_realizations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY concept_realizations_owner_delete
  ON public.concept_realizations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.concept_realizations');

COMMENT ON TABLE public.concept_realizations IS 'Per-language surface forms for a core concept. user_id NULL = curated global (read-only); user_id set = owner-only. Realizations are a runtime/user-owned concept; never seeded here.';
COMMENT ON COLUMN public.concept_realizations.realization_type IS 'word = single token; phrase = multi-token; construction = syntactic pattern; feature = grammatical category; morpheme = bound morpheme.';

-- =============================================================================
-- learner_concept_progress
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.learner_concept_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  core_concept_id uuid NOT NULL
    REFERENCES public.core_concepts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  knowledge_level text NOT NULL DEFAULT 'encountered'
    CHECK (knowledge_level IN ('encountered', 'recognized', 'retrievable', 'flexible')),
  evidence_count integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, core_concept_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_learner_concept_progress_user_lang
  ON public.learner_concept_progress (user_id, language_code);

ALTER TABLE public.learner_concept_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY learner_concept_progress_owner_select
  ON public.learner_concept_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY learner_concept_progress_owner_insert
  ON public.learner_concept_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY learner_concept_progress_owner_update
  ON public.learner_concept_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY learner_concept_progress_owner_delete
  ON public.learner_concept_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

SELECT public.mark_updated_at('public.learner_concept_progress');

COMMENT ON TABLE public.learner_concept_progress IS 'Per-user evidence level per concept per language. Owner-only via direct user_id. Encountered is the floor; promotion to recognized/retrievable/flexible requires explicit learner evidence, not just repeated exposure.';

-- =============================================================================
-- Seed: neutral Core 0–2 concept catalog
-- =============================================================================
-- These codes are language-neutral functional primitives. No language-
-- specific realizations, no source content, no lyrics. Realizations are a
-- user-owned runtime concept seeded by analysis or curation, never here.
--
-- Tier 0: most universal (existence, core deixis, volition, negation).
-- Tier 1: high-frequency functions (motion, perception, cognition,
--         location, preference).
-- Tier 2: still common but slightly more specific (interrogatives, time,
--         quantity, comparison, connectives).

INSERT INTO public.core_concepts (code, canonical_label, description, functional_cluster, tier) VALUES
  -- Tier 0 — pronouns & deixis
  ('FIRST_PERSON', 'First person', 'Reference to the speaker/writer.', 'pronoun', 0),
  ('SECOND_PERSON', 'Second person', 'Reference to the addressee.', 'pronoun', 0),
  ('THIRD_PERSON', 'Third person', 'Reference to a non-participant.', 'pronoun', 0),
  ('POSSESS', 'Possession', 'Expression of ownership or belonging.', 'possession', 0),
  -- Tier 0 — core functions
  ('EXIST', 'Existence / being', 'Affirming that something exists or is the case.', 'existence', 0),
  ('WANT', 'Want / desire', 'Expression of desire.', 'volition', 0),
  ('NEED', 'Need / necessity', 'Expression of necessity.', 'volition', 0),
  ('CAN_ABILITY', 'Ability (can)', 'Expression of capability or possibility.', 'modal', 0),
  ('NEGATION', 'Negation', 'Denial or absence of something.', 'negation', 0),
  -- Tier 1 — volition & preference
  ('LIKE_PREFER', 'Like / prefer', 'Expression of preference or liking.', 'volition', 1),
  -- Tier 1 — motion
  ('GO', 'Go (motion away)', 'Movement away from a deictic center.', 'motion', 1),
  ('COME', 'Come (motion toward)', 'Movement toward a deictic center.', 'motion', 1),
  ('MOVE_TO', 'Move to / into', 'Movement with a destination.', 'motion', 1),
  ('MOVE_FROM', 'Move from / out of', 'Movement with an origin.', 'motion', 1),
  -- Tier 1 — location
  ('LIVE_STAY', 'Live / stay / reside', 'Inhabiting or remaining in a place.', 'location', 1),
  ('LOCATE_IN', 'Location in / inside', 'Position within a container or area.', 'location', 1),
  ('LOCATE_ON', 'Location on / at', 'Position on a surface or at a point.', 'location', 1),
  -- Tier 1 — perception
  ('SEE', 'See / watch', 'Visual perception.', 'perception', 1),
  ('HEAR', 'Hear / listen', 'Auditory perception.', 'perception', 1),
  -- Tier 1 — cognition & communication
  ('KNOW', 'Know', 'Cognition of a fact or person.', 'cognition', 1),
  ('THINK', 'Think / believe', 'Mental process or opinion.', 'cognition', 1),
  ('UNDERSTAND', 'Understand / comprehend', 'Grasping meaning.', 'cognition', 1),
  ('SAY', 'Say / tell / speak', 'Verbal communication.', 'communication', 1),
  -- Tier 2 — interrogatives
  ('QUESTION_PERSON', 'Who (person question)', 'Question about a person.', 'interrogative', 2),
  ('QUESTION_THING', 'What (thing question)', 'Question about a thing.', 'interrogative', 2),
  ('QUESTION_PLACE', 'Where (place question)', 'Question about a place.', 'interrogative', 2),
  ('QUESTION_TIME', 'When (time question)', 'Question about a time.', 'interrogative', 2),
  -- Tier 2 — time
  ('TIME_NOW', 'Now', 'Reference to the present moment.', 'time', 2),
  ('TIME_BEFORE', 'Before / past', 'Reference to an earlier time.', 'time', 2),
  ('TIME_AFTER', 'After / future', 'Reference to a later time.', 'time', 2),
  -- Tier 2 — quantity
  ('QUANTITY_ONE', 'One / single', 'Unity or singularity.', 'quantity', 2),
  ('QUANTITY_MANY', 'Many / much / plural', 'Plurality or large amount.', 'quantity', 2),
  ('QUANTITY_SOME', 'Some / a few', 'Indefinite partial quantity.', 'quantity', 2),
  -- Tier 2 — comparison
  ('MORE', 'More', 'Greater quantity or degree.', 'comparison', 2),
  ('LESS', 'Less / fewer', 'Smaller quantity or degree.', 'comparison', 2),
  ('SAME', 'Same / also', 'Identity or similarity.', 'comparison', 2),
  ('DIFFERENT', 'Different / other', 'Distinction or otherness.', 'comparison', 2),
  -- Tier 2 — connectives
  ('REASON_BECAUSE', 'Because / reason', 'Causal connective.', 'connective', 2),
  ('CONTRAST_BUT', 'But / however', 'Adversative connective.', 'connective', 2),
  ('CONDITION_IF', 'If / condition', 'Conditional connective.', 'connective', 2)
ON CONFLICT (code) DO NOTHING;
