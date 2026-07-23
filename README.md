# KnowAlong

> A private, user-owned language-learning tool that turns user-pasted media text (first vertical: song lyrics) into structured study material and flashcards.

## What KnowAlong is

- A **private study library.** You paste media text you already have the right to use; KnowAlong organizes it into sections, lines, vocabulary, and practice cards. Your library is private — there is no lyric catalogue, scraping, discovery, or sharing.
- A **lyrics-first vertical** of a broader media-language-learning vision. The architecture is designed so future source types (articles, subtitles, ebooks, conversation transcripts) can land without restructuring the schema, but only **lyric paste import** ships in this checkpoint.
- **Source-faithful by design.** Source text is preserved exactly as you provided it. Normalized text, translations, transliterations, grammar analysis, and generated practice live in separate fields/records and are always visibly labelled. Generated material is never presented as lyrics or quoted source text.
- **Built on a 47-pattern architecture constitution** with a 12-audit pre-commit gate, repository pattern, Zustand + React Query, and the MobilePremium design system inherited from a clean PWA-first starter shell.

## What KnowAlong isn't

- A lyric search engine, scraper, or discovery surface. There is no built-in catalogue and no third-party fetching.
- A language-learning app with a pre-shipped curriculum. The Core Concept framework ships language-neutral concept codes only (FIRST_PERSON, EXIST, WANT, GO, …) — realizations, translations, and learner progress are user-owned, never seeded as language-specific content.
- A turnkey native release. PWA-first with native scaffolding (icon, iOS, Android, splash plugin in `app.config.ts` + placeholder PNGs at `./assets/`). Native is an intentional future extension.
- A working LLM product in this checkpoint. The cloud-analysis contract is fully typed but unimplemented — `mediaAnalysisService` returns a typed `{ status: 'unconfigured' }` result and the import flow surfaces that clearly.
- A cloud-connected or remote-deployed companion. The optional local companion runs on `127.0.0.1` only and wraps a local Ollama instance — never cloud LLM, never `0.0.0.0`.

## Quickstart

Prerequisites: Node, Bun, Docker (for local Supabase).

```bash
bun install
bunx supabase start            # one-time local Docker Supabase bootstrap
bunx supabase db reset --local # applies all migrations (inherited + KnowAlong)
cp .env.local.example .env.local  # then edit .env.local with local URL + key
bun run web
```

Visit `localhost:8081`. Register a user. You should land on the empty library with an "Add lyrics" CTA.

For development without Docker, the app ships in **demo mode**: when `EXPO_PUBLIC_SUPABASE_URL` is missing or a placeholder, repositories return fixture data so all screens render. Demo mode is automatically detected — no flag to set.

### Local env shape

`.env.local` (gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start-output>
```

No secrets. Both vars are `EXPO_PUBLIC_*` (publishable to the client). The local publishable key comes from the `supabase start` output.

## The architecture, in 30 seconds

```
Route (app/) → Hook (hooks/) → Service (services/) → Repository (utils/supabase/repositories/) → Supabase
                   ↑
              Zustand store (stores/) for client state
              React Query for server state
```

- **No direct Supabase calls outside repositories.** `audit-data-layer.ts` (S9) enforces this.
- **No `console.log` outside `utils/logger.ts`.** `audit-logging-errors.ts` (S11) enforces this.
- **No hardcoded hex colors.** `audit-ui-theme.ts` (S7) enforces this.
- **No `router.push` outside `navigation/NavigationHelper.tsx`.** `audit-component-quality.ts` (C1) enforces this.

The full 47-pattern constitution lives in `ARCHITECTURE.md`. The 12-audit pre-commit gate is in `CLAUDE.md` → "Pre-commit checks".

## Data model overview

The schema is **source-faithful**: the user-provided text lives in one chain, the normalized/analyzed layer lives alongside it, and generated practice is separately labelled.

```
learning_sources          (user_id direct; the paste event + metadata)
  └─ source_sections      (verse, chorus, stanza — RLS via source)
       └─ source_lines    (exact text the user pasted, by ordinal — RLS via source)

source_segments           (multi-line analysis-derived spans; ordered; RLS owner-only)
  └─ source_line_segments (per-line span link table; sole authoritative span)

lexical_lemmas            (user_id direct; headwords)
  └─ lexical_forms       (inflected forms seen in source; no user_id, RLS via lemma)
token_occurrences         (a token in a source line linked to a form; RLS via source→line)
lexical_senses            (glosses / definitions per lemma; RLS owner-only)
lemma_concept_links       (lemma ↔ Core Concept mapping; RLS owner-only)
grammar_patterns          (attested grammar patterns with source context; RLS owner-only)

core_concepts             (language-neutral codes: FIRST_PERSON, EXIST, …; read-only)
  └─ concept_realizations (how a concept surfaces in a language — user-owned or curated-global)
learner_concept_progress  (per-user evidence level per concept per language)

study_cards               (user_id direct; flexible target FKs; source_segment_id is context, not a target)
  ├─ review_states        (per-card scheduler state; RLS via card)
  ├─ review_attempts      (user_id direct; the again/hard/good/easy log)
source_readiness_snapshots (per-user, per-source, optional section)

analysis_runs             (source_analysis | clcc_generation; user_id direct; NO 'succeeded' status)
  ├─ analysis_events      (appended; ≤500-char sanitized stage messages; deduped by (run_id, ordinal))
  └─ analysis_proposals   (the draft review layer; pending → accepted/edited/rejected/superseded)
```

Three card kinds are enforced at the DB layer via CHECK constraints:

1. **`source_recognition` / `source_production` / `source_cloze`** — must reference a `source_line_id`. Quotes or clozes exact source text. `generated_content = false`.
2. **Source-derived grammar / section-level cards** — reference `source_id` or `source_section_id` (not necessarily a single line). `generated_content = false`.
3. **`generated_transfer`** — `generated_content = true`. Must reference at least one target (`lexical_lemma_id` / `target_core_concept_id` / `target_realization_id`). Never quotes source text.

The CHECK constraints make this distinction queryable from any client without trusting client-side discipline. `transferPolicyService.validateTransferCardProposal()` adds a runtime layer enforcing "≥1 target" and "≤1 unknown target in the difficulty budget" before a transfer card is persisted.

## Why source / normalized / generated stay distinct

The product distinction that shapes the data model: **source text is preserved exactly as the user provided it; normalized text, translations, transliterations, grammar analysis, and generated practice live in separate fields/records and are always visibly labelled. Generated material must never be presented as lyrics or quoted source text.**

- `source_lines.line_text` is the verbatim paste — never rewritten by normalization.
- `token_occurrences` links a slice of that text to a `lexical_forms` row (normalized) without mutating the source.
- A `study_card` row tagged `generated_content = true` is generated practice; the UI labels it "Generated practice" and never presents its content as source.

## Core Concept framework

The Core Concept framework is a language-neutral backbone for talking about what a learner is actually acquiring. Each concept is identified by a stable code (`FIRST_PERSON`, `EXIST`, `WANT`, `GO`, `NEGATION`, …), assigned a tier (0 = most universal, 3 = most peripheral), and given a canonical English label + description for documentation only.

- **`core_concepts`** is read-only to authenticated users; ~35 neutral Core 0–2 codes are seeded by the migration. No language-specific realizations, no source content, no lyrics.
- **`concept_realizations`** are how a concept surfaces in a specific language — a word, a phrase, a construction, or a grammatical feature. Realizations are a runtime/user-owned concept: `user_id IS NULL` rows are curated global read-only; `user_id = <uid>` rows are owner-only.
- **`learner_concept_progress`** is per-user evidence level (`encountered`, `recognized`, `retrievable`, `flexible`) per concept per language. Encountered does not auto-promote to a higher level — promotion is an explicit learner act.

The framework does not claim that all languages share English grammar, word boundaries, or sentence templates. Concepts are deliberately coarse enough to bridge language families; realizations carry the language-specific shape.

## Readiness calculation

`calculateReadiness(input)` is a **pure function** in `utils/knowalong/readiness.ts`. It produces a 0–100 readiness score per source (or section) based on:

| Component | Weight | What it measures |
|---|---|---|
| RECALL | 0.50 | Fraction of eligible source-derived cards with a non-overdue recent successful review. |
| MATURITY | 0.25 | Cards with ≥3 successful reviews and ≥1 day since last review. |
| COVERAGE | 0.15 | Fraction of the source's eligible concepts with learner evidence ≥ recognized. |
| BURDEN | 0.10 | Penalty for overdue cards (lowers the score). |

The calculation is versioned (`CALCULATION_VERSION = 'knowalong-mvp-v1'`); the version lands in `source_readiness_snapshots.calculation_version`. Source-derived cards only; `generated_transfer` cards are explicitly excluded by the caller. If there are no eligible source-derived cards, the result is `{ kind: 'not-assessed' }` and the UI shows "Not assessed" rather than 0%.

Full weights and tests in `utils/knowalong/readiness.ts` and `__tests__/knowalong/readiness.test.ts`.

## Scope of this checkpoint

**Ships:**
- Architecture and full data layer (13 baseline tables across 5 baseline migrations, repositories, services, hooks, store).
- 5 additive migrations for local analysis + CLCC: `source_segments` + `source_line_segments` (005), `analysis_runs` + `analysis_events` (006), `analysis_proposals` (007), `lexical_senses` / `grammar_patterns` / `lemma_concept_links` / `token_occurrence_senses` (008), and `study_cards` extensions + analysis-run provenance backfill (009). All additive, no breaking changes.
- Domain types and Zod schemas (entities, DTOs, analysis contract, readiness, difficulty budget, local companion contract).
- Pure tested readiness calculation (`knowalong-mvp-v1`).
- Cross-language Core Concept framework with seeded neutral codes.
- Typed future cloud-analysis contract (no calls — `mediaAnalysisService` returns `{ status: 'unconfigured' }`).
- Optional local companion service (Bun + Ollama; `127.0.0.1:8765` only). Source-analysis pipeline (9 stages) + CLCC generation pipeline (5 stages). Authenticated SSE-over-fetch progress streaming with deduped replay and heartbeat.
- Authenticated SSE-over-fetch PWA client (`utils/companion/companionClient.ts`) with strict bearer-header-only token transport.
- Proposal-first review UI: per-source analysis run detail, proposal cards with per-kind acceptance matrix, batch review, CLCC realization review (export-only).
- Demo adapter + fixtures so every screen renders without a real Supabase.
- Full PWA UI: library, 4-step import stepper, source detail with Lyrics/Study/Words tabs, source analysis tab, analysis run detail with live progress + proposal review, section detail, lemma detail, review session, settings with privacy + companion sections, dev showcase.
- 13 vitest suites + 8 companion Bun test files.

**Out of scope (deferred):**
- Cloud LLM integration, API keys for cloud providers, Edge Function model execution, remote deploy.
- Remote Supabase deployment, `db push`, or remote release of any kind.
- Segment proposal promotion into `source_segments` + ordered `source_line_segments` — schema ships in migration 005 but the repository exposes read + delete only; segment Accept is disabled with reason "Segment promotion is deferred until atomic multi-record promotion is available." A future approved transaction/RPC design is required.
- Lexical form as a generated-card target — `form` is NOT in the generated-transfer target set; a card may target lemma / Core Concept / realization / grammar_pattern ONLY.
- CLCC promotion into `concept_realizations` — realization proposals are reviewable/editable/rejectable/exportable only.
- The separate future KnowAlong Studio admin application (reviewed import, versioned language-pack releases, secure server-side cloud jobs, learner read-only consumption). The current CLCC routes are a temporary unlinked internal operator surface that will be extracted or replaced by KnowAlong Studio after the learner/source-analysis and bridge-deck workflow have been validated.
- Audio, synced lyric timing, music playback/streaming, Spotify/Apple/YouTube.
- Lyric search, scraping, third-party fetching, public browsing, sharing, discovery.
- OCR, image/PDF parsing, SRT parsing, ebook parsing.
- AnkiConnect/export.
- Full FSRS scheduling — the review loop is provisional/preview only.
- Universal vocabulary list, full CEFR curriculum, production language packs.
- Full inflection/paradigm generation. Lemma detail says "forms encountered in your library" — never "complete inflection table".
- Native release work (`eas.json`, platform validation).
- Self-signed TLS, certificate management, local HTTPS proxying, broad CSP relaxations for deployed HTTPS→loopback (deferred compatibility item).
- Final logo, domain, payments, analytics, notifications, social.

### Local analysis (optional companion)

The optional local companion is a Bun process that wraps a local Ollama instance and exposes a strict loopback HTTP API on `127.0.0.1:8765`. It is **off by default** and requires the user to opt in by running it locally and pasting the banner-printed token into `Settings → Local analysis`. The companion **owns and generates its token**; the PWA stores only a client copy in SecureStore. The companion NEVER writes to Supabase — all Supabase writes happen PWA-side through the existing repository layer.

Two capabilities ship in this checkpoint:

1. **Source analysis** (learner-facing) — 9-stage pipeline over a learner's pasted lyrics/text. Produces per-source reviewable proposals (sections, segment spans, line translations, lemmas, forms, morphology, grammar patterns, concept mappings, cards). Each proposal is reviewed independently per the acceptance matrix; segment and token_occurrence promotion is disabled in this checkpoint.
2. **CLCC generation** (internal operator tooling, NOT a learner feature) — 5-stage pipeline scoped to French / Russian / Persian (fa). Generates per-concept realization proposals that are reviewable, editable, rejectable, and JSON-exportable. Promotion into `concept_realizations` is deferred.

Progress is streamed via authenticated SSE-over-fetch (NOT native `EventSource`, which cannot send `Authorization` headers). The PWA parses SSE frames manually over `fetch().body`. Reconnect resumes via the `Last-Event-ID` header.

**Deployed-HTTPS-to-loopback is a named compatibility limitation.** The deployed PWA is served over HTTPS; the companion is loopback HTTP by default. Browser handling of secure-page-to-loopback-HTTP requests varies by browser (mixed-content blocking, Private Network Access preflight, per-browser policy). The tested path is the local development origin (`http://localhost:8081` / `http://127.0.0.1:8081`). Deployed-PWA-to-loopback is a deferred compatibility item; the PWA surfaces specific failures (`companion.mixed-content-blocked`, `companion.unreachable`, `companion.unauthorized`, `companion.origin-forbidden`, `companion.network-error`, `companion.timeout`) rather than a generic "companion unavailable". See `_reports/local-analysis-clcc.md` for the full ADR and `tools/local-companion/README.md` for setup, onboarding, and troubleshooting.

### Provisional grammar / morphology caveat

The grammar and morphology columns on `lexical_lemmas` / `lexical_forms` (gender, animacy, verb aspect, case, tense, person, number, …) are nullable by design. They are populated by analysis output and are **as good as the analysis that produced them**. There is no claim of complete paradigm coverage. The schema is permissive enough to grow into richer analysis without a migration.

## Reference docs

| Doc | What it owns |
|---|---|
| `CLAUDE.md` | Repo operating context (invariants, pre-commit checks, KnowAlong-specific extensions, doc maintenance). Auto-loads in Claude Code sessions at the repo root. |
| `ARCHITECTURE.md` | The 47-pattern constitution (inherited) + KnowAlong consumer-specific extensions (domain hierarchy, readiness formula, card safety). |
| `docs/OWNERSHIP.md` | Claim-type → canonical-owner map. Settles "which doc owns X" disputes. |
| `docs/architecture/mobile-premium-design-system.md` | The MobilePremium kit (inherited from the starter shell). |
| `docs/architecture/pwa-installability.md` | The PWA installability contract (manifest, SW, runtime injection). |
| `docs/contributing.md` | How to evolve the starter shell itself (inherited). |
| `_reports/knowalong-lyrics-domain-architecture.md` | Durable ADR: consumer-only ownership, private-content boundary, source-vs-generated safety rule, readiness versioning. |

## Limitations

- **Palette not yet overridden.** The palette in `constants/theme.ts` is inherited unchanged from the starter shell and is not overridden in this checkpoint. Final logo and brand color are undecided.
- **Provisional scheduling.** Review intervals are a simple heuristic, not FSRS. Scheduling will change.
- **Cloud analysis is unconfigured.** Every attempt to call the cloud-analysis contract returns `{ status: 'unconfigured' }` until cloud analysis is wired. The local companion is the supported path for in-session analysis.
- **Deployed HTTPS to loopback companion is browser-dependent.** Mixed-content blocking and Private Network Access may intervene. The tested path is the local development origin. See `_reports/local-analysis-clcc.md` for the compatibility matrix and the specific error taxonomy.
- **Segment promotion is deferred.** The `source_segments` + `source_line_segments` schema ships in migration 005, but segment Accept is disabled in the UI ("Segment promotion is deferred until atomic multi-record promotion is available."). Segment proposals remain reviewable, editable, rejectable, and exportable.
- **CLCC routes are a temporary unlinked internal operator surface.** They are not a learner feature, are not protected admin authorization, cannot publish language packs, and cannot promote candidates into canonical shared realizations. They will be extracted or replaced by the separate future KnowAlong Studio admin application after the learner/source-analysis and bridge-deck workflow have been validated. CLCC languages are scoped to French / Russian / Persian (fa).
- **Single vertical.** Only lyric paste import ships. Future source types (subtitles, articles, ebooks) require their own parsers and likely additional `source_type` enum values.

## Stack

- Expo SDK ~54.0.x (web-only static export)
- React Native 0.81.x (New Architecture)
- React 19.x
- TypeScript ~5.9.x (strict)
- Tamagui 2.3.x
- Expo Router (latest on SDK 54)
- Reanimated ~4.1.x
- Supabase JS ^2.79.x
- Zustand ^5 + React Query ^5
- Zod ^4
- Vitest
- Bun
