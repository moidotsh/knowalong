# KnowAlong

> KnowAlong is a private, user-owned language-learning tool that turns user-pasted media text (first vertical: song lyrics) into structured study material and flashcards. It is built on a clean PWA-first starter shell that ships a 47-pattern constitution, 12-audit pre-commit gate, repository pattern, Zustand + React Query, and the MobilePremium design system.

This file is the repo-level operating context for Claude Code sessions at the KnowAlong root. It auto-loads. Read the relevant section before landing any change.

## Invariants

Load-bearing rules that aren't obvious from the code. Shell-level invariants (1–11) are inherited from the starter and still apply verbatim; KnowAlong-specific extensions (M1–M5) follow.

1. **Bun only.** Never commit `package-lock.json` or `yarn.lock`. `audit-pattern-compliance.ts` (S19) enforces this.
2. **PWA-first. Web is the supported default; native Expo export is an intentional future extension, with native assets and platform validation required before release.** Native scaffolding ships in `app.config.ts` (`icon`, `ios`, `android`, `expo-splash-screen` plugin) + placeholder PNGs at `./assets/`. `app.json` mirrors `app.config.ts` as a synchronized template; `app.config.ts` is the build-authoritative source. `ios.bundleIdentifier: 'app.knowalong'` is starter scaffolding — replace with a real iOS bundle ID before any native release. Runtime manifest-injection in `app/_layout.tsx` remains load-bearing — Expo Web's static export strips `<link rel="manifest">` from `dist/index.html`, and runtime injection restores it. Don't remove that block without reading `docs/architecture/pwa-installability.md` first.
3. **Light is the default; dark is opt-in.** `constants/theme.ts` ships both `theme.colors.light` and `theme.colors.dark` — structurally identical palettes. The active palette is resolved at runtime by `useAppTheme()`. The user's preference persists across sessions via `zustandStorage`, with `'system'` as the default. `audit-ui-theme.ts` (S7) bans hardcoded hex colors. **KnowAlong does not override the inherited palette** — see M2 below.
4. **Email/password auth by default.** No PIN primitives ship. Re-adding PIN auth is a future customization if the threat model ever requires it.
5. **The `brand` color slot is the single override point.** KnowAlong inherits the starter's neutral indigo and does **not** override it in this checkpoint — see M2.
6. **Audit scripts are canonical.** If this file and `scripts/audit-*.ts` disagree, the scripts win.
7. **The 490px height-budget test** carries over. Any new MobilePremium screen must fit at 490px viewport height without scrolling for the primary action.
8. **Stories system is deliberately absent.** A future customization if onboarding tutorials are needed.
9. **`vercel.json` ships in the repo** for a working first deploy. Consumers don't need to touch this unless they add function routes or a different build pipeline.
10. **RPC-outcome telemetry ships disabled by default.** The system is inherited and available; no KnowAlong RPCs are wired yet.
11. **"Copy for AI" is a dev helper, not a runtime screen surface.** `navigation/routeMetadata.ts` is the consumer-extension seam — KnowAlong does not populate it in this checkpoint.

### KnowAlong-specific extensions

**M1. Private-content boundary.** KnowAlong is a private, user-owned library. The product surface has no lyric catalogue, no scraping, no third-party fetching, no public browsing, no sharing, no discovery. Only content the user pastes in lives here. Never add a feature that fetches lyrics, lyrics metadata, or any third-party copyrighted content. The Core Concept seed migration ships only neutral, language-neutral concept codes (FIRST_PERSON, EXIST, WANT, …) — never song lyrics, copyrighted text, or language-specific realizations.

**M2. Brand palette is undecided; do not override.** Final brand direction (logo, color, iconography) is undecided. `constants/theme.ts` is inherited unchanged from the starter shell. Do not hardcode any tentative brand hex in source, comments, migrations, components, manifest, or docs. When a final brand color lands, it goes in `theme.colors.light.brand` (and the related `brand*` / `buttonBackground*` keys) — the single override point per invariant 5. Until then, every screen resolves through the inherited indigo. Add a clearly-marked brand-token seam only if the existing theme architecture exposes a clean override point that does not require choosing a hex now.

**M3. Source vs. generated card safety rule.** Three card kinds are enforced at the DB layer (see `supabase/migrations/20260722000004_knowalong_study_readiness.sql`):
- **Source-derived cards** (`source_recognition`, `source_production`, `source_cloze`, plus source-derived grammar / section-level cards): `generated_content = false`. Cards that quote or cloze exact source text MUST reference a `source_line_id`.
- **Generated-transfer cards** (`generated_transfer`): `generated_content = true`. MUST reference at least one target (`lexical_lemma_id` / `target_core_concept_id` / `target_realization_id`). Never quotes source text.

The CHECK constraints make this distinction queryable from any client. `services/transferPolicyService.ts` adds a runtime layer: a generated card requires ≥1 target and rejects when the difficulty budget contains >1 unknown target. The UI visibly labels generated cards "Generated practice" — generated material must never be presented as lyrics or quoted source text.

**M4. Demo mode is a first-class operating mode.** When `EXPO_PUBLIC_SUPABASE_URL` is missing or a placeholder, `utils/supabase/repositories/demoMode.ts` exports `DEMO_MODE = true`. Repository methods internally delegate to `demoAdapter.ts` (fixture-backed, no Supabase calls). `mediaAnalysisService` returns a typed `{ status: 'unconfigured' }` result. Every screen must render in demo mode — there is no separate demo build. `useCurrentUserId()` returns `DEMO_USER_ID` in demo mode so all hooks work without auth.

**M5. Readiness calculation is versioned and pure.** `utils/knowalong/readiness.ts` exports `calculateReadiness(input)` — a pure function with no React, no Supabase, no I/O. The version (`CALCULATION_VERSION = 'knowalong-mvp-v1'`) lands in `source_readiness_snapshots.calculation_version`. Source-derived cards only; `generated_transfer` cards are explicitly excluded by the caller. If there are no eligible source-derived cards, the result is `{ kind: 'not-assessed' }` — the UI shows "Not assessed" rather than 0%. Changing the formula bumps the version; old snapshots remain readable under their own version.

**M6. Local companion is opt-in, loopback-only, and owns its token.** The optional local companion (`tools/local-companion/`) wraps a local Ollama instance and binds `127.0.0.1` only — never `0.0.0.0`, never a public interface, never cloud LLM. The companion **owns and generates its API token**; the PWA stores only a paste-supplied client copy in SecureStore. The PWA never generates, rotates, or mints a token. The companion NEVER writes to Supabase — all Supabase writes happen PWA-side through the existing repository layer. No cloud provider API keys, no Edge Function model execution, no RPC, no remote transaction is added in this checkpoint.

**M7. Proposal-first review; per-proposal acceptance; no atomicity claim; segment Accept disabled.** Every analysis run produces `analysis_proposals` rows that stay `pending` until the learner explicitly reviews them. The acceptance matrix in `_reports/local-analysis-clcc.md` (deliverable 3) is authoritative: each proposal kind has a single-row destination (`section`, `line_translation`, `lemma`, `form`, `morphology`, `grammar_pattern`, `concept_mapping`, `card`) OR is deferred (`segment`, `token_occurrence`, `realization`). **Segment proposal promotion into `source_segments` + ordered `source_line_segments` is DISABLED in this checkpoint** — the schema ships in migration 005 but no repository write method and no UI acceptance path exists. Acceptance iterates independently per proposal; there is NO atomic all-or-nothing claim across proposals and NO client-side rollback mechanism. Batch acceptance returns per-proposal outcomes.

**M8. CLCC routes are a temporary unlinked internal operator surface; languages fr/ru/fa only; promotion deferred.** The CLCC routes (`app/clcc.tsx`, `app/clcc/[runId].tsx`) are NOT a learner feature, are NOT protected admin authorization, and do NOT publish language packs or promote candidates into canonical shared realizations. They are a temporary unlinked internal operator surface in the KnowAlong repository, retained only for local candidate generation, review, and export while the learner-facing source-analysis workflow is validated. They will be extracted or replaced by the separate future **KnowAlong Studio** admin application after the learner/source-analysis and bridge-deck workflow have been validated. CLCC languages are scoped to **French / Russian / Persian (fa)** only in this checkpoint; adding a language requires updating the Zod schema allowlist AND the companion pipeline's prompt catalogue. CLCC promotion into `concept_realizations` is **deferred** — realization proposals are reviewable/editable/rejectable/exportable only.

**M9. Verbose progress is non-negotiable.** When a run is in flight, the UI MUST render a persistent compact progress card AND an expandable event timeline driven by the authenticated SSE-over-fetch event stream. Stage labels are fixed (9 stages for source analysis; 5 for CLCC generation) and always visible. The terminal state is **`awaiting_review`** — never `succeeded`. There is no `succeeded` status in the `AnalysisRunStatus` union. Failure paths surface a specific user-facing message per the companion error taxonomy (M12), not a generic "companion unavailable".

**M10. SSE-over-fetch is the primary transport; NOT native EventSource; polling is fallback only.** The PWA uses raw `fetch()` + manual SSE-frame parsing over the `ReadableStream` body to receive companion job events. This is required because the browser's native `EventSource` constructor cannot send `Authorization` headers, and putting the token in the URL / query string / event ID / cookie / localStorage-visible state is unacceptable. `utils/companion/companionClient.ts` is the sole PWA file that calls raw `fetch()` for SSE — it is in the S8 carve-out list in `eslint.structure.config.js` with a narrow justification comment. Short-interval polling of `GET /jobs/:id?include=events` is fallback-only when streaming is unavailable.

**M11. Analysis-run retention is user-owned; no source text in events; delete-run is first-class.** `analysis_events.message` is capped at 500 characters and carries only sanitized stage / progress text — NEVER raw model chain-of-thought, NEVER the source text, NEVER prompts, NEVER secrets, NEVER the bearer token. `analysis_runs.source_content_checksum` records ONLY the sha256 of the joined source text — not the text itself. The user can delete any run (`useDeleteAnalysisRun`); deletion cascades to `analysis_events` + `analysis_proposals` but NEVER removes accepted curated destination rows (`source_sections`, `lexical_lemmas`, `grammar_patterns`, `lemma_concept_links`, `study_cards`) — those are user-owned study material whose provenance is recorded via `source_run_id` with `ON DELETE SET NULL`.

**M12. Deployed-HTTPS-to-loopback is a named compatibility limitation.** The deployed PWA is served over HTTPS; the companion is loopback HTTP by default. Browser handling of secure-page-to-loopback-HTTP requests varies (mixed-content blocking, Private Network Access preflight, per-browser policy). Setting CORS headers alone does NOT guarantee a deployed HTTPS PWA can reach a loopback HTTP companion. The PWA detects companion-connection failures via a specific error taxonomy (`companion.unreachable` / `companion.mixed-content-blocked` / `companion.unauthorized` / `companion.origin-forbidden` / `companion.network-error` / `companion.timeout`), each surfacing a specific user-facing message. The tested path is the **local development origin** (`http://localhost:8081` / `http://127.0.0.1:8081`). Deployed-PWA-to-loopback is a named deferred compatibility item. Do NOT add self-signed TLS, certificate management, local HTTPS proxying, or broad CSP relaxations in this checkpoint.

**M13. Generated-transfer card targets: lemma / Core Concept / realization / grammar_pattern ONLY.** A `generated_transfer` study card MUST have `generated_content = true`, a `difficulty_budget`, and at least one of: `lexical_lemma_id`, `target_core_concept_id`, `target_realization_id`, `grammar_pattern_id`. The CHECK constraint in migration 009 (`study_cards_generated_transfer_target_check`) enforces exactly this set. **`form` is NOT a generated-card target in this checkpoint** — `lexical_form_id` is not added as a target column, and the UI surfaces "blocked — form is not a generated-card target in this checkpoint" before submission. A lexical form may be explained as card metadata/context but does NOT satisfy the generated-transfer target predicate. `source_segment_id` is context only and also does NOT satisfy the target requirement.

**M14. Source-level segment offsets removed; per-line link table is the sole authoritative span.** `source_segments` has NO `start_offset` and NO `end_offset` columns. The ordered `source_line_segments` rows are the SOLE authoritative span representation. `assembled_display_text` + `display_text_checksum` (sha256 hex) remain as derived/reconstruction-integrity values. The reconstruction rule concatenates each segment's ordered `source_line_segments` rows' `line_fragment` (or full `source_lines.raw_text` when `line_fragment IS NULL`), joined by `\n`. Per-line `start_offset` / `end_offset` on `source_line_segments` must satisfy `0 ≤ start_offset ≤ end_offset ≤ length(source_lines.raw_text)` for that specific line.

## Pre-commit checks (read before committing)

The 12 structural audits + `tsc --noEmit` + structural ESLint run on every `git commit` via `.husky/pre-commit`. Any failure blocks the commit. Run them on the working tree **before** staging:

    bun run lint:structure && bunx tsc --noEmit

**Canonical source:** `scripts/audit-*.ts`. If this section and the scripts disagree, the scripts win.

### The two universal escape hatches

- **`// <check>-exempt`** — suppresses one violation within a 300-char lookback (e.g. `// s7-exempt`, `// c1-exempt`). Use sparingly with a justification.
- **`git commit --no-verify`** — skips the hook entirely. Reserve for genuine emergencies.

### The 12 audits, in pre-commit order

| # | Script | Codes | Catches |
|---|--------|-------|---------|
| 1 | `audit-barrels.ts` | `[S5-internal]`, `[S5-external]` | Own-barrel imports (circular); direct-path imports when a barrel re-exports the symbol. Only audit with `--fix`. |
| 2 | `audit-data-layer.ts` | `[S9-import]`, `[S9-call]`, `[S13]`, `[D5]` | Direct `supabase.*` in `app/`/`hooks/`/`components/`/`context/`; inline `queryKey: [...]`; repository methods not returning `RepositoryResult<T>`. |
| 3 | `audit-state.ts` | `[D3]`, `[D10]` | `useMutation` not touching a cache primitive; Zustand stores missing the 5 `// SECTION:` markers. |
| 4 | `audit-security.ts` | `[S12]`, `[SE2]`, `[S10]` | Anchored regex `.test()` in client code; AsyncStorage imports outside the allowlist; `Alert.alert` with raw `error.message`. |
| 5 | `audit-logging-errors.ts` | `[S11]`, `[S10]` | Live `console.*`; raw `throw new Error(...)` outside the carve-out. |
| 6 | `audit-ui-theme.ts` | `[S7]`, `[C3]` | Hardcoded hex colors; `Dimensions.get('window'/'screen')`. **Critical for light-mode enforcement.** |
| 7 | `audit-component-quality.ts` | `[C1]`, `[C2]`, `[C4]` | Direct `router.push/replace/back`; RN `Modal`; `ActivityIndicator` outside loading primitives. |
| 8 | `audit-testing-types.ts` | `[D6]`, `[T1]`, `[T2]` | UI code importing raw `shared/types`; test files outside `__tests__/`; inline `vi.mock()`. |
| 9 | `audit-pattern-compliance.ts` | `[S19]`, `[C10]` | `package-lock.json`/`yarn.lock` in tree; imports of deprecated symbols. |
| 10 | `audit-runtime-resilience.ts` | `[R4a]`, `[R4b]`, `[R1]` | `setInterval` without `clearInterval`; `addEventListener` without `removeEventListener`; async `useEffect` that awaits then setState/navigates without a cancellation guard. |
| 11 | `audit-screen-body.ts` | `[SB1]` | Full-screen route in `app/` (excluding `_layout.tsx`, `+not-found.tsx`, `dev/`) missing `SCREEN_BODY_STYLE`. Suppress with `// sb1-exempt`. |
| 12 | `audit-mobile-content-width.ts` | `[SB2-portal]`, `[SB2-magic-number]` | Portal component missing `...MOBILE_CONTENT_WIDTH_STYLE` / `...MOBILE_DIALOG_WIDTH_STYLE` spread on its panel style entry; literal numeric `maxWidth` under `components/`. |

Structural ESLint (`eslint.structure.config.js`) enforces two more:
- **`[S6]`** — `{expr && <Component/>}` render leak.
- **`[S8]`** — raw `fetch()`.

### The five that bite most often

1. **S5 barrels** — same-folder imports go to the relative source (`./Foo`); cross-folder imports go through the folder barrel. Run `bun run scripts/audit-barrels.ts --fix` to auto-rewrite.
2. **C1 router calls** — never call `router.push/replace/back` directly outside `navigation/NavigationHelper.tsx` and `hooks/useAuthNavigation.ts`. KnowAlong extends the navigation helper with `navigateToSource`, `navigateToSection`, `navigateToLemma`, `navigateToReview`, `navigateToImport`, `navigateToKnowAlongDemo`.
3. **S9 supabase** — never `import` from `@supabase/supabase-js` or call `supabase.from/auth/rpc/...` in `app/`, `hooks/`, `components/`, or `context/`. Go through `utils/supabase/*` or `services/*`.
4. **S7 hex colors** — never hardcode hex in component code. Pull from `theme.colors.light.*` via `useAppTheme()` or a `constants` import. SVG vectors and `constants/theme.ts` are exempt.
5. **S11 console** — never ship `console.log/error/warn`. Use `logger` from `utils/logger`.

### Content-width policy (`CONTENT_WIDTH_MODE`)

Inherited as-is from the starter. `constants/styles.ts` → `CONTENT_WIDTH_MODE = 'constrained'` is the source of truth. Runtime styles (`MOBILE_CONTENT_WIDTH_STYLE`, `MOBILE_DIALOG_WIDTH_STYLE`, `SCREEN_BODY_STYLE`) and the SB1 + SB2 audits all read this binding.

## KnowAlong domain map

| Layer | Location |
|---|---|
| KnowAlong migrations | `supabase/migrations/20260722*_knowalong_*.sql` (10 files: 5 baseline + 5 local-analysis/CLCC additive) |
| Domain types & Zod schemas | `shared/types/knowalong/` (barrel-exported from `shared/types/index.ts`; includes `companion.ts` for local companion contract) |
| Demo fixtures | `shared/fixtures/` (demoSources, demoCards, demoConcepts) |
| Repositories | `utils/supabase/repositories/` (learningSourceRepository, sourceSectionRepository, vocabularyRepository, studyCardRepository, reviewRepository, coreConceptRepository, sourceSegmentRepository, analysisRunRepository, analysisEventRepository, analysisProposalRepository, lexicalSenseRepository, grammarPatternRepository, lemmaConceptLinkRepository, demoAdapter) |
| Demo mode flag | `utils/supabase/repositories/demoMode.ts` (`DEMO_MODE`, `DEMO_USER_ID`) |
| Companion credential + client | `utils/companion/credential.ts`, `utils/companion/companionClient.ts` (S8 carve-out for SSE-over-fetch) |
| Readiness calculation | `utils/knowalong/readiness.ts` (pure, versioned) |
| Services | `services/` (learningSourceService, readinessService, reviewService, mediaAnalysisService, transferPolicyService, companionClientService, localAnalysisService, clccGenerationService, proposalReviewService) |
| React Query hooks | `hooks/queries/`, `hooks/mutations/` (includes analysis-run, companion, CLCC, and SSE lifecycle hooks) |
| Import stepper store | `stores/importDraftStore.ts` (4-step state, 5 SECTION markers, not persisted) |
| Domain routes | `app/` (index, import, source/[id], source/[id]/analysis, source/[id]/analysis/[runId], source/[id]/section/[sectionId], vocabulary/[lemmaId], review, settings, settings/companion, clcc, clcc/[runId], dev/knowalong) |
| Composed domain components | `components/knowalong/` (incl. CompanionStatusChip, AnalysisProgressCard, AnalysisStageRail, AnalysisEventTimeline, ProposalCard, ProposalReviewBatch, ClccRealizationProposal) |
| Local companion service | `tools/local-companion/` (Bun + Ollama; `127.0.0.1:8765`; config gitignored; ignored by structural ESLint) |
| KnowAlong tests | `__tests__/knowalong/` |

## Demo mode

Demo mode is detected in `utils/supabase/repositories/demoMode.ts`:

```ts
export const DEMO_MODE =
  !resolvedUrl || resolvedUrl.startsWith('EXPO_PUBLIC_SUPABASE_URL') || resolvedUrl === '';
```

When `DEMO_MODE = true`:
- Every repository method internally delegates to `demoAdapter.ts` (fixture-backed, no Supabase calls).
- `mediaAnalysisService` returns `{ status: 'unconfigured' }` (or a demo fixture when an explicit demo flag is passed).
- `useCurrentUserId()` returns `DEMO_USER_ID`, so every hook works without auth.

Demo mode is not a separate build target — every screen must render in demo mode. To exercise the real Supabase path, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (see README → Quickstart).

## Enabling RPC telemetry

The RPC-outcome telemetry stack is inherited from the starter. No KnowAlong RPCs are wrapped yet. When a domain RPC lands:

1. Apply the inherited migration if not already applied.
2. Deploy the inherited edge function.
3. Wrap the client-side `supabase.rpc(...)` call in `withRpcTelemetry(rpc, actorId, fn)`.
4. **Same commit:** add the RPC name to `ALLOWED_RPCS` in `supabase/functions/track-rpc/index.ts`.

The wrap + allowlist entry are a pair. Don't land one without the other.

Full inherited documentation for the telemetry stack is in the starter shell.

## Documentation maintenance

This is the contract that prevents doc drift. For every change you land in code, the table below says **what triggers a doc update** and **where the update lands**. Shell-level rows are inherited; KnowAlong rows are appended.

| Change you're making | Update this doc | When |
|---|---|---|
| New pattern (S/C/D/SE/T/R code) | `ARCHITECTURE.md` (definition + rationale) + new `scripts/audit-*.ts` if statically-checkable + this file's pre-commit table. | Always. |
| New `scripts/audit-*.ts` | This file's pre-commit table (the 12-audit grid). Run order matters — place it correctly. | Always. |
| Audit exemption / regex tweak | `scripts/audit-*.ts` (canonical source). This file is the cheatsheet. | Always. |
| Visual token change (color, spacing, typography) | `constants/theme.ts` (canonical source) + `docs/architecture/mobile-premium-design-system.md` if it affects the design system. | Always. |
| New MobilePremium primitive | `docs/architecture/mobile-premium-design-system.md` (component inventory) + `app/dev/premium.tsx` (the visual source of truth). | Always. |
| New animation/utility hook (`hooks/use*.ts`) | `hooks/index.ts` barrel + `app/dev/premium.tsx` (add an interactive demo if the hook has visible output). | Always. |
| New utility (`utils/*.ts` or `shared/utils/*.ts`) | The folder barrel (`utils/index.ts` / `shared/utils/index.ts`). | Always. |
| New navigation route / push-replace helper | `navigation/NavigationHelper.tsx` (extend `NavigationPath` enum + `navigationHierarchy` map). | Always. |
| New route wired to `<CopyForAiButton>` | `navigation/routeMetadata.ts` → `ROUTE_AI_METADATA` map. | Always. |
| New PWA-installability change | `docs/architecture/pwa-installability.md`. Runtime injection block in `app/_layout.tsx` and `index.html` must stay in sync. | Always. |
| Vercel deploy config change | `vercel.json` (canonical source). | Always. |
| New Zustand store | This file is enough for cross-cutting stores. Add the 5 `// SECTION:` markers per audit D10. | Always. |
| Schema migration (KnowAlong-side) | Migration file header (always — multi-line "why"). | Always. |
| New RPC wrapped in `withRpcTelemetry` | `ALLOWED_RPCS` set in `supabase/functions/track-rpc/index.ts` (add the entry in the same commit). | Always. |
| New edge function | This file (note in invariant #10 if it changes the shell-level surface); reuse `_shared/` helpers; fail-closed CORS by default. | Always. |
| Shell-wide architectural decision | `ARCHITECTURE.md` first; cross-link here. | When the decision affects multiple files. |
| **New KnowAlong domain entity / table** | Migration file header (multi-line "why") + this file → KnowAlong domain map. | Always. |
| **Readiness formula change** | `utils/knowalong/readiness.ts` (bump `CALCULATION_VERSION`) + `README.md` → Readiness calculation table + `_reports/knowalong-lyrics-domain-architecture.md` (ADR revision note). | Always. |
| **New Core Concept seed batch** | Migration file header. Concepts are language-neutral only — never add language-specific realizations or source content to seeds. | Always. |
| **Brand override lands** | `constants/theme.ts` → `theme.colors.light.brand` + related keys + this file (remove M2 deferral note) + `README.md` → Limitations. | When a final brand color is chosen. |
| **New local-companion route / job type** | `tools/local-companion/router.ts` + `ARCHITECTURE.md` → "Local analysis & CLCC" + `_reports/local-analysis-clcc.md`. | Always. |
| **New analysis proposal kind** | `proposalReviewService.ts` acceptance matrix + `_reports/local-analysis-clcc.md` (deliverable 3) + `__tests__/knowalong/proposalReview.test.ts`. | Always. |
| **New companion error taxonomy kind** | `shared/types/knowalong/companion.ts` + `utils/companion/companionClient.ts` classifier + `__tests__/knowalong/companionErrorTaxonomy.test.ts` + `__tests__/knowalong/companionClient.test.ts`. | Always. |
| **New CLCC scope language** | `shared/types/knowalong/schemas.ts` allowlist + companion pipeline prompt catalogue + `_reports/local-analysis-clcc.md`. Languages are fr/ru/fa ONLY in this checkpoint. | Always. |

### Rules

1. **One owner per claim.** If two docs appear to own the same claim, one is canonical and the other cross-links.
2. **Navigation layers don't restate content.** `README.md` and this file's intro paragraphs are navigation surfaces — they point at canonical content; they don't redefine it.
3. **Audit scripts are canonical.** If a doc and the scripts disagree, the scripts win — fix the doc.

## Canonical docs

| Claim type | Canonical owner |
|---|---|
| Repo operating context (invariants, pre-commit checks, KnowAlong extensions, doc maintenance) | this file |
| Architecture constitution (47 patterns) + KnowAlong consumer extensions | `ARCHITECTURE.md` |
| Project orientation (what KnowAlong is, quickstart, data model, scope) | `README.md` |
| Claim-type → owner-doc map (cross-cutting) | `docs/OWNERSHIP.md` |
| MobilePremium design system | `docs/architecture/mobile-premium-design-system.md` |
| PWA installability | `docs/architecture/pwa-installability.md` |
| How to evolve the starter shell itself | `docs/contributing.md` |
| Durable lyrics-domain ADR (private-content boundary, source-vs-generated safety rule, readiness versioning) | `_reports/knowalong-lyrics-domain-architecture.md` |
| Durable local-analysis/CLCC ADR (companion trust/auth/CORS, SSE-over-fetch, acceptance matrix, span model, HTTPS-to-loopback limitation, deferred promotion items) | `_reports/local-analysis-clcc.md` |
| Durable Learner-Studio-CLCC product-boundary ADR (Learner PWA ownership, Studio boundary, data boundary, language-pack lifecycle, future bridge-card contract, rollout order, explicit non-goals) | `_reports/learner-studio-clcc-boundary.md` |
| Durable Bridge Deck Generation Contract (bridge-deck definition, inputs, output categories, per-card metadata, binding sequencing rules, exclusions, future-generator acceptance criteria, illustrative scaffold, non-implementation mapping) | `_reports/bridge-deck-generation-contract.md` |
| Local companion operating manual (setup, onboarding, token rotation, model list, troubleshooting) | `tools/local-companion/README.md` |
