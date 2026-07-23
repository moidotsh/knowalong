# KnowAlong lyrics-domain architecture (ADR)

> Durable architecture decision record for the KnowAlong lyrics-domain checkpoint. Self-contained — no sibling-repo names, no workspace paths, no private provenance. Records the load-bearing decisions, why they were made, and what is explicitly deferred.

## Status

Accepted. Applies to the lyrics-domain checkpoint. Subsequent checkpoints (audio, subtitles, ebooks, cloud analysis, native release) extend or supersede individual decisions; the ADR is the revision-trail anchor.

## Context

KnowAlong is a private, user-owned language-learning tool that turns user-pasted media text into structured study material and flashcards. The first vertical is song lyrics. The product distinction that shapes the data model:

**Source text is preserved exactly as the user provided it. Normalized text, translations, transliterations, grammar analysis, and generated practice live in separate fields/records and are always visibly labelled. Generated material must never be presented as lyrics or quoted source text.**

User-imported content is private. There is no lyric catalogue, scraping, discovery, or sharing. The application does not fetch lyrics or any third-party copyrighted content. The only text that lives in a user's library is text the user pasted in.

The checkpoint ships the architecture and a polished frontend vertical slice for lyric paste import only. Out of scope: actual LLM calls, remote deploy, audio, scraping, SRT/ebook parsing, AnkiConnect, full FSRS, native release, final branding.

## Decision matrix

### 1. Consumer-only ownership

**Decision:** KnowAlong is a consumer of a clean PWA-first starter shell. The 47-pattern architecture constitution and 12-audit pre-commit gate are inherited verbatim and apply unchanged. KnowAlong owns only the domain layer (migrations, types, repositories, services, hooks, stores, routes, composed components, fixtures, tests).

**Why:** The shell already encodes the structural invariants (repository pattern, type separation, audit gate, design system, PWA installability). Redoing them per consumer is the failure mode the shell exists to prevent.

**Consequence:** Any shell-level bug fix or primitive improvement that surfaces during KnowAlong development is a candidate port back to the shell, not a KnowAlong-only patch.

### 2. Private-content boundary

**Decision:** The product surface has no lyric catalogue, no scraping, no third-party fetching, no public browsing, no sharing, no discovery. Only content the user pastes in lives in the library. The Core Concept seed migration ships only neutral, language-neutral concept codes (FIRST_PERSON, EXIST, WANT, …) — never song lyrics, copyrighted text, or language-specific realizations.

**Why:** Copyright and product focus. A language-learning tool that preserves the user's own relationship with media they already have the right to use is a different product from a lyric catalogue. Mixing the two would force every design and legal decision to carry the catalogue's weight.

**Consequence:** No feature in this checkpoint fetches third-party content. The cloud-analysis contract accepts user-pasted text only; it is a typed future seam, not a fetch surface. Future sources (subtitles, articles, ebooks) will be user-pasted too; scraping remains out of scope.

### 3. Source-faithful data model

**Decision:** The schema separates source (verbatim), normalized (analysis output), and generated (practice) into distinct columns and records:
- `source_lines.line_text` is the verbatim paste — never rewritten by normalization.
- `token_occurrences` links a slice of source text to a `lexical_forms` row (normalized) without mutating the source.
- `study_cards` with `generated_content = true` are generated practice; the UI labels them "Generated practice" and never presents their content as source.

**Why:** The core promise to the learner is that what they're studying is what they actually encountered in the media. Silent normalization breaks that promise. Generated material presented as source misleads the learner about what the original author wrote.

**Consequence:** Three card kinds are enforced at the DB layer via CHECK constraints (see §5). The UI visibly labels generated cards. The schema is permissive enough to grow into richer analysis without a migration.

### 4. Normalized source→section→line→occurrence→form→lemma relation

**Decision:** The source chain is strictly hierarchical. `learning_sources` (user_id direct) → `source_sections` (RLS via source) → `source_lines` (RLS via source; verbatim by ordinal) → `token_occurrences` (RLS via source→line). The lexicon chain is `lexical_lemmas` (user_id direct) → `lexical_forms` (RLS via lemma; no user_id column). `token_occurrences.lexical_form_id` references `lexical_forms` `ON DELETE SET NULL` so deleting a form doesn't lose the occurrence.

**Why:** The hierarchy mirrors how a learner thinks about media (a song has verses, verses have lines, lines have words). Keeping `lexical_forms` and `token_occurrences` user_id-less avoids denormalization without giving up row-level security — ownership resolves through the parent chain.

**RLS pattern:** Every child table without a direct `user_id` column resolves ownership through `EXISTS (select 1 from parent where parent.id = child.parent_id and parent.user_id = auth.uid())` in both `USING` and `WITH CHECK`.

### 5. Source-derived vs. generated-transfer card safety rule

**Decision:** Four CHECK constraints in `study_cards` enforce the card-kind taxonomy at the DB layer:

1. Source-derived cards cannot be `generated_content = true`.
2. `generated_transfer` MUST be `generated_content = true` AND have at least one target (`lexical_lemma_id` / `target_core_concept_id` / `target_realization_id`).
3. Cards that quote or cloze exact source text MUST reference a `source_line_id`.
4. Every non-generated card MUST reference at least its `source_id`.

**Runtime layer:** `services/transferPolicyService.ts → validateTransferCardProposal(proposal, budget)` enforces "≥1 target in the budget" and rejects when the difficulty budget contains >1 unknown target.

**Why:** Trusting client-side discipline for the source/generated distinction is the classic bug source — a refactor in the client passes the wrong flag and the database silently fills with mislabelled cards. CHECK constraints make the distinction queryable from any client. The runtime layer adds the difficulty budget gate that the DB can't express (a budget is contextual, not row-level).

**Consequence:** Adding a new card kind requires a migration to extend the CHECK constraints. This is intentional — the taxonomy is load-bearing.

### 6. Core Concept framework (language-neutral)

**Decision:** The Core Concept framework is a language-neutral backbone. Each concept has a stable `code`, a `canonical_label`, a `description`, a `functional_cluster`, and a `tier` (0 = most universal, 3 = most peripheral). The seed migration ships ~35 neutral Core 0–2 codes only. Realizations (`concept_realizations`) are how a concept surfaces in a specific language — user-owned (`user_id` set) or curated global (`user_id IS NULL`). Realizations are a runtime/user-owned concept; the seed never ships language-specific realizations.

**Why:** A curriculum that ships English grammar as the universal baseline fails the moment a learner picks Russian, Mandarin, or Arabic. The framework does not claim that all languages share English grammar, word boundaries, or sentence templates. Concepts are deliberately coarse enough to bridge language families; realizations carry the language-specific shape.

**Consequence:** `core_concepts` is read-only to authenticated clients. `concept_realizations` with `user_id IS NULL` are curated global read-only; only an owner can write their own realizations. `learner_concept_progress` carries per-user evidence level (`encountered` < `recognized` < `retrievable` < `flexible`). Encountered does not auto-promote to a higher level — promotion is an explicit learner act.

### 7. Readiness calculation versioning

**Decision:** `calculateReadiness(input)` is a pure function in `utils/knowalong/readiness.ts` (no React, no Supabase, no I/O). It is versioned via `CALCULATION_VERSION = 'knowalong-mvp-v1'`. The version lands in `source_readiness_snapshots.calculation_version`. Old snapshots remain readable under their own version. Changing the formula bumps the version; the bump is a code-only change (column already exists, no migration needed).

Weights (`knowalong-mvp-v1`):
- `RECALL = 0.50` — fraction of eligible source-derived cards with a non-overdue recent successful review (≤7 days).
- `MATURITY = 0.25` — cards with ≥3 successful reviews AND ≥1 day since last review.
- `COVERAGE = 0.15` — fraction of eligible concepts with learner evidence ≥ `recognized`.
- `BURDEN = 0.10` — penalty for overdue cards (lowers the score).

Eligibility: source-derived cards only; `generated_transfer` cards are explicitly excluded by the caller. For section readiness, only cards whose `source_section_id` matches are eligible.

If there are no eligible source-derived cards, the result is `{ kind: 'not-assessed' }` and the UI shows "Not assessed" rather than 0%.

**Why:** Readiness is a heuristic, not a measurement. It will evolve as the product learns what predicts learning. Versioning lets old snapshots remain interpretable after the formula changes; without it, every formula bump silently rewrites history.

### 8. Demo mode as a first-class operating mode

**Decision:** When `EXPO_PUBLIC_SUPABASE_URL` is missing or a placeholder, `utils/supabase/repositories/demoMode.ts` exports `DEMO_MODE = true`. Repository methods internally delegate to `demoAdapter.ts` (fixture-backed, no Supabase calls). `mediaAnalysisService` returns `{ status: 'unconfigured' }`. `useCurrentUserId()` returns `DEMO_USER_ID` so every hook works without auth.

**Why:** A private PWA whose every screen requires a real Supabase roundtrip is hostile to demo, design review, and contributor onboarding. Demo mode lets every screen render without infrastructure. There is no separate demo build — demo mode is a runtime detection, not a build target.

**Consequence:** Every screen must render in demo mode. Fixtures (`shared/fixtures/`) are original, non-copyrighted, KnowAlong-owned content. The demo adapter shadows every repository method shape — when a new repository method lands, the demo adapter grows a matching fixture-backed implementation in the same change.

### 9. Typed future cloud-analysis contract (no calls)

**Decision:** `shared/types/knowalong/analysis.ts` ships the full typed contract for a future cloud-analysis service: `MediaAnalysisRequest`, `MediaAnalysisResponse`, sub-types for sections/lines/tokens/lemmas/forms/morphology/card-proposals/transfer-proposals/concept-candidates/analysis-warnings. `services/mediaAnalysisService.ts` ships `UnavailableMediaAnalysisService` (default, returns `{ status: 'unconfigured' }`) and `DemoMediaAnalysisService` (opt-in, returns the one fixture payload).

**Why:** The analysis pipeline will eventually be a real cloud service. Designing the contract before the implementation forces the schema, the transfer-policy gate, and the UI flow to be honest about what they need. Shipping the typed seam now means wiring the real service later is a drop-in implementation, not a redesign.

**Consequence:** The transfer-policy service (`validateTransferCardProposal`) is the runtime gate that runs before any generated card is persisted, regardless of which analysis implementation produced it. No analysis output reaches the database without passing the policy.

## Scope (in / out)

**In scope (this checkpoint):**
- Architecture and full data layer (13 tables across 5 migrations, repositories, services, hooks, store).
- Domain types and Zod schemas (entities, DTOs, analysis contract, readiness, difficulty budget).
- Pure tested readiness calculation (`knowalong-mvp-v1`).
- Cross-language Core Concept framework with seeded neutral codes.
- Typed future cloud-analysis contract (no calls).
- Demo adapter + fixtures so every screen renders without a real Supabase.
- Full PWA UI: library, 4-step import stepper, source detail with Lyrics/Study/Words tabs, section detail, lemma detail, review session, settings with privacy section, dev showcase.
- 6 vitest suites.

**Out of scope (deferred):**
- Actual LLM integration, API keys, prompt execution, cloud model calls, Edge Functions, remote functions.
- Remote Supabase deployment, `db push`, or remote release of any kind.
- Audio, synced lyric timing, music playback/streaming.
- Lyric search, scraping, third-party fetching, public browsing, sharing, discovery.
- OCR, image/PDF parsing, SRT parsing, ebook parsing.
- AnkiConnect/export.
- Full FSRS scheduling — the review loop is provisional/preview only.
- Universal vocabulary list, full CEFR curriculum, production language packs.
- Full inflection/paradigm generation. Lemma detail says "forms encountered in your library" — never "complete inflection table".
- Native release work (`eas.json`, platform validation).
- Final logo, final product name, domain, payments, analytics, notifications, social.

## Revision trail

| Version | Date | Change |
|---|---|---|
| `knowalong-mvp-v1` | 2026-07-22 | Initial lyrics-domain checkpoint. 13 tables, 5 migrations, readiness v1, demo mode, typed analysis contract (unimplemented). |

Future revisions append a row. Readiness formula changes bump `CALCULATION_VERSION` and add a row here. Schema changes are documented in the migration file header (multi-line "why") — this ADR does not restate migration-level changes; it records architecture decisions only.
