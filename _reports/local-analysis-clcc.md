# Local Analysis & CLCC — Durable ADR (Revision 3)

Status: **Active.** Migration-bearing checkpoint. Commit locally, STOP before push.

This is the canonical Architecture Decision Record for the optional local companion, the source-analysis workflow, and the CLCC generation workflow in KnowAlong. `ARCHITECTURE.md` → "Local analysis & CLCC" is the consumer-facing summary; this document owns the full reasoning, the per-decision trade-offs, the Phase 0 inspection record, and the deferred-work list.

---

## 1. Context

KnowAlong's initial lyrics-domain checkpoint shipped (`fab4f9d`) with a typed-but-unconfigured `mediaAnalysisService` returning `{ status: 'unconfigured' }`. The spec now requires a real, local-LLM-assisted analysis workflow with verbose, visible processing for two capabilities:

1. **Lyric/text analysis** — a learner-facing 9-stage pipeline over a learner's pasted lyrics/text. Produces per-source reviewable proposals (sections, segment spans, line translations, lemmas, forms, morphology, grammar patterns, concept mappings, cards).
2. **CLCC generation** — an internal operator 5-stage pipeline scoped to French / Russian / Persian (fa). Generates per-concept realization proposals.

Both run against an optional local companion that wraps a local Ollama instance and binds `127.0.0.1` only.

---

## 2. Non-negotiable invariants

These are binding. Each is enforced by code, audit, or migration constraint; a violation stops the work.

1. **Companion binds `127.0.0.1` only**, opt-in. Never `0.0.0.0`. Never cloud LLM.
2. **Companion owns and generates its local API token.** The PWA stores only a paste-supplied client copy in SecureStore.
3. **Companion NEVER writes to Supabase.** The PWA owns all writes through the existing repository layer.
4. **No cloud LLM.** No Edge Function model execution. No RPC. No remote transaction.
5. **Strict explicit CORS allowlist.** No wildcard, no reflection. Companion's `allowedOrigins` array is the source of truth.
6. **Source text is preserved exactly.** Segments are analysis-derived linguistic units, never a mutation of source.
7. **All proposals `pending` until explicitly reviewed.** Generated material is visibly labelled. Per-proposal independent acceptance.
8. **Authenticated SSE-over-fetch** for live progress (NOT native `EventSource`). Token in `Authorization` header ONLY — never in URL, query, event ID, cookie, or localStorage-visible state.
9. **Verbose progress is non-negotiable.** Persistent compact progress card + expandable event timeline. Terminal state is `awaiting_review` — **never `succeeded`** (no such status exists).
10. **Multi-table promotion (segment + line span) is NOT available in this checkpoint.** Segment Accept is disabled with a specific reason. The schema ships in migration 005 so proposals remain reviewable/editable/exportable.
11. **Generated-transfer card targets: lemma / Core Concept / realization / grammar_pattern ONLY.** `form` is NOT a target. The CHECK constraint in migration 009 enforces exactly the four target columns.
12. **Source-level segment offsets removed.** Ordered `source_line_segments` is the sole authoritative span representation.
13. **CLCC promotion into `concept_realizations` deferred.** Realization proposals are reviewable/editable/rejectable/exportable only.
14. **CLCC routes are a temporary unlinked internal operator surface.** Not a learner feature. Not protected admin authorization. Will be extracted or replaced by the separate future KnowAlong Studio admin application after the learner/source-analysis and bridge-deck workflow have been validated.
15. **Commit locally, STOP before push.** This checkpoint contains 5 new additive migrations, so push is approval-gated per the workspace push protocol.

---

## 3. Trust, auth, and CORS

```
Browser PWA ──bearer-authenticated HTTP──> 127.0.0.1:8765 (Bun.serve) ──> Ollama (127.0.0.1:11434)
              ↑                                                                             ↑
              │ token travels ONLY in Authorization header                                │ loopback only
              │ NEVER in URL / query / event ID / cookie / localStorage                   │ never 0.0.0.0
```

### 3.1 Loopback-only binding

`Bun.serve({ hostname: '127.0.0.1', port: 8765, fetch: router })`. The companion refuses to start on `0.0.0.0`. No cloud provider API keys. No outbound calls except to Ollama on `127.0.0.1:11434`.

### 3.2 Token ownership — companion owns; PWA pastes

- **Companion generates the token** on first start. Random 32-byte hex. Stored at `tools/local-companion/config/companion.local.json` with `0600` permissions (gitignored). Rotated by `scripts/rotateToken.ts`.
- **Companion prints the token ONCE** to stdout on first start (and on rotation).
- **PWA pastes the token.** `app/settings/companion.tsx` accepts paste-only input. There is no `generateToken` / `rotateToken` / `newToken` function in `utils/companion/credential.ts` — this is asserted by `companionCredential.test.ts`.
- **PWA stores only a client copy** in SecureStore (with an in-memory fallback for tests / SSR / demo mode).

### 3.3 Bearer authentication

Every route except `/health` requires `Authorization: Bearer <token>`. The token is compared constant-time. 401 on mismatch.

`/health` is unauthenticated and minimal: `{ version, loopback, authenticationRequired }`. No models. No token. No config.

### 3.4 Strict CORS allowlist

`allowedOrigins` from companion config is the source of truth.

| Origin header | Behavior |
|---|---|
| Absent (CLI / curl / same-origin) | Allow. |
| Present + in `allowedOrigins` | Set `Access-Control-Allow-Origin: <that exact origin>`. |
| Present + NOT in `allowedOrigins` | 403. |

**No wildcard, no reflection, ever.** Five-case test coverage in `tools/local-companion/__tests__/cors.test.ts`.

---

## 4. SSE-over-fetch transport (NOT native EventSource)

### 4.1 Why NOT native `EventSource`

The browser's native `EventSource` constructor **does not allow setting arbitrary request headers**. It cannot send `Authorization: Bearer <token>`. Putting the token in the URL query string, `event.id`, cookie, or localStorage-visible state is unacceptable — it leaks into server access logs, browser history, referrer headers, and devtools.

### 4.2 Implementation

`openAuthenticatedEventStream` lives in `utils/companion/companionClient.ts`. It uses raw `fetch()` + manual SSE-frame parsing over the `ReadableStream` body:

```
fetch(JOB_EVENTS_URL, {
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Authorization': 'Bearer <token>',
    'Last-Event-ID': <last-ordinal-or-omitted>,
  },
  signal: abortController.signal,
})
  → response.body.getReader() → TextDecoder → SSE frame parser (split on \n\n)
  → per-frame: parse event:, data:, id: lines
  → heartbeat comments (`: heartbeat\n\n`) → onHeartbeat (silent)
  → onEvent({ kind, ordinal, severity, stage, message, payload, eventId })
  → track lastOrdinal for reconnect resume
  → React Query cache + analysis_events persistence (dedupe by (run_id, ordinal))
```

S8 (raw-fetch ban) carve-out added to `eslint.structure.config.js` for this one file with a narrow justification comment.

### 4.3 Reconnect semantics

On transient close (fetch stream ends without `AbortController` trigger), the hook waits 2s and re-opens with `Last-Event-ID: <lastOrdinal>`. Companion replays retained events after that cursor. Dedup is by `(run_id, ordinal)` in the React Query cache; the unique constraint on `analysis_events(run_id, ordinal)` is the floor.

### 4.4 Fallback

If `fetch()` streaming is unavailable (rare), the hook falls back to short-interval polling of `GET /jobs/:id?include=events&since=N` (still bearer-authenticated). Polling is fallback-only; SSE-over-fetch is primary.

### 4.5 Heartbeat

Companion emits `: heartbeat\n\n` every 15s when idle. The client treats it as a liveness signal only — no event is fired.

### 4.6 History cap

Companion retains up to 2000 events per job (FIFO). When the cap is hit, replay emits a single `history-truncated` event with `severity: 'warning'`; the client surfaces it in the timeline.

### 4.7 Clean close

On terminal status, the companion closes the stream cleanly. `AbortController.abort()` on the client is treated as close, not error.

### 4.8 Test coverage (`__tests__/knowalong/companionClient.test.ts`)

- Authorization header is present on every authenticated request.
- Token never appears in URL, query string, event ID, or persisted payload.
- `Last-Event-ID` honored when `sinceOrdinal > 0`; omitted on the first connection.
- Heartbeat comments handled without emitting an event.
- `history-truncated` surfaces as a warning, not an error.
- 401 → `companion.unauthorized`.
- `AbortController.abort()` closes cleanly with no unhandled rejection.

---

## 5. Migration dependency graph

Every FK is created only AFTER both the referencing and referenced tables exist. `source_run_id` columns are added in migration 009 (after `analysis_runs` exists in 006), NOT inline in 005/008. **Verification rule: each FK is added in a file whose ordinal is strictly greater than both the referencing table's create file and the referenced table's create file.**

```
[00000000000000_rpc_telemetry.sql]                            (inherited, unchanged)
[20260722000000_knowalong_schema_helpers.sql]                (existing, unchanged — set_updated_at())
            │
            ▼
[20260722000001_knowalong_sources.sql]                       (existing)
   learning_sources, source_sections, source_lines
            │
            ▼
[20260722000002_knowalong_lexicon.sql]                       (existing)
   lexical_lemmas, lexical_forms, token_occurrences
            │
            ▼
[20260722000003_knowalong_core_concepts.sql]                 (existing)
   core_concepts, concept_realizations, learner_concept_progress
            │
            ▼
[20260722000004_knowalong_study_readiness.sql]               (existing)
   study_cards (4 inline-unnamed CHECKs), review_states, review_attempts,
   source_readiness_snapshots
            │
   ═════════╧═════════════════════════════════════════════ NEW (005–009, all additive)
            ▼
[20260722000005_knowalong_source_segments.sql]               (NEW)
   source_segments — NO source_run_id (added in 009); NO source-level start/end offset
      FKs: user_id implicit; source_id → 00001; source_section_id → 00001 (nullable)
      Columns: segment_kind, ordinal, assembled_display_text, display_text_checksum, label
      Constraints: unique(source_id, ordinal), CHECK segment_kind
      NOTE: schema ships but segment proposals are NOT promotable in this checkpoint.
   source_line_segments — link table; sole authoritative span
      FKs: source_line_id → 00001; source_segment_id → 005 (self)
      Columns: ordinal, start_offset nullable, end_offset nullable, line_fragment nullable
      Constraints: unique(source_line_id, source_segment_id), unique(source_segment_id, ordinal)
            │  (consumed by 008 grammar_patterns.source_segment_id and 009 study_cards.source_segment_id)
            ▼
[20260722000006_knowalong_analysis_runs.sql]                 (NEW)
   analysis_runs
      Columns: user_id, source_id (nullable → 00001), run_type, status, target_language_code,
               model_label, companion_version, source_content_checksum (NOT source text),
               source_line_count, requested_at, started_at, completed_at,
               failure_reason, request_params jsonb, summary jsonb
      Constraints: CHECK run_type ∈ source_analysis/clcc_generation,
                   CHECK status ∈ queued/connecting/running/validating/awaiting_review/
                                   failed/cancelled  (NO succeeded)
   analysis_events
      Columns: user_id, run_id (FK cascade → 006), ordinal, severity, stage, message ≤500, payload jsonb
      Constraints: CHECK severity, unique(run_id, ordinal)
            │  (consumed by 007 analysis_proposals.run_id; 009 *.source_run_id)
            ▼
[20260722000007_knowalong_analysis_proposals.sql]            (NEW)
   analysis_proposals (direct user_id, FK run_id cascade → 006)
      Constraints: CHECK proposal_kind ∈ section/segment/line_translation/token_occurrence/
                                              lemma/form/morphology/grammar_pattern/
                                              concept_mapping/card/realization,
                   CHECK review_status ∈ pending/accepted/edited/rejected/superseded
      Columns: ordinal, payload jsonb, edited_payload jsonb, reviewer_note, reviewed_at
      Constraints: unique(run_id, proposal_kind, ordinal)
            │
            ▼
[20260722000008_knowalong_lexicon_extensions.sql]            (NEW)
   lexical_senses (FK lemma_id → 00002; NO source_run_id — added in 009)
   grammar_patterns (FKs: source_id → 00001; source_section_id → 00001;
                         source_segment_id → 005; target_core_concept_id → 00003;
                         target_lemma_id → 00002; NO source_run_id — added in 009)
   lemma_concept_links (FKs lemma_id → 00002; core_concept_id → 00003;
                         NO source_run_id — added in 009)
   token_occurrence_senses (link table FKs → 00002)
            │  (grammar_patterns.id consumed by 009 study_cards.grammar_pattern_id)
            ▼
[20260722000009_knowalong_study_cards_extensions.sql]        (NEW)
   STEP A — ALTER TABLE study_cards ADD COLUMN:
      • source_segment_id uuid → source_segments (005) [context, NOT a target]
      • grammar_pattern_id uuid → grammar_patterns (008) [IS a valid generated target]
      • difficulty_budget jsonb
      • provenance varchar(32) CHECK ∈ manual/source_analysis/clcc_generation
      • source_run_id uuid → analysis_runs (006) ON DELETE SET NULL
   STEP B — Backfill source_run_id on every analysis-derived table now that 006 exists:
      • ALTER TABLE source_segments ADD COLUMN source_run_id uuid REFERENCES analysis_runs(id)
      • ALTER TABLE lexical_senses ADD COLUMN source_run_id ...
      • ALTER TABLE grammar_patterns ADD COLUMN source_run_id ...
      • ALTER TABLE lemma_concept_links ADD COLUMN source_run_id ...
      (Each with ON DELETE SET NULL — never cascade. Indexes with IF NOT EXISTS.)
   STEP C — Targeted constraint migration (literal name from Phase 0, no DO block):
      • ALTER TABLE study_cards DROP CONSTRAINT IF EXISTS <literal_name>
      • ADD CONSTRAINT study_cards_generated_transfer_target_check with the new predicate
        that also accepts grammar_pattern_id. (Other 3 existing CHECKs stay untouched.)
   STEP D — New indexes:
      • idx_study_cards_segment ON (source_segment_id) WHERE NOT NULL
      • idx_study_cards_grammar_pattern ON (grammar_pattern_id) WHERE NOT NULL
      • idx_study_cards_run ON (source_run_id) WHERE NOT NULL
      • idx_*_run on each backfilled table — IF NOT EXISTS.
```

---

## 6. Phase 0 inspection record (binding)

### 6.1 Root tsconfig / moduleResolution

Strategy A applies: root `tsconfig.json` covers `tools/local-companion/**` cleanly. `bunx tsc --noEmit` from repo root typechecks companion. `bun test tools/local-companion` from repo root discovers and runs tests. The companion `package.json` carries scripts only — no separate dependencies. `eslint.structure.config.js` ignores `tools/**` (separate Bun-only runtime).

### 6.2 Literal study-cards constraint name

Phase 0 inspection: `SELECT conname, pg_getConstraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.study_cards'::regclass AND contype = 'c' ORDER BY conname;`

**Expected default on a clean DB:** `study_cards_check1` — the second inline-unnamed CHECK on `study_cards` in migration `20260722000004_knowalong_study_readiness.sql`. It is the only CHECK whose definition contains `(card_kind <> 'generated_transfer'::text)`.

Migration 009 STEP C uses this literal name:

```sql
ALTER TABLE public.study_cards
  DROP CONSTRAINT IF EXISTS study_cards_check1;

ALTER TABLE public.study_cards
  ADD CONSTRAINT study_cards_generated_transfer_target_check
  CHECK (
    (card_kind <> 'generated_transfer')
    OR
    (generated_content = true AND (
       lexical_lemma_id IS NOT NULL
       OR target_core_concept_id IS NOT NULL
       OR target_realization_id IS NOT NULL
       OR grammar_pattern_id IS NOT NULL
    ))
  );
```

**If Phase 0 finds a different actual name**, substitute it verbatim. **If Phase 0 cannot identify the constraint uniquely** (zero or multiple matches), STOP — do not run migration 009 with a guess.

This constant is asserted by `__tests__/knowalong/constraintNameInspection.test.ts` (live-DB only; skipped under DEMO_MODE).

### 6.3 `source_lines.translation` reconfirmation

Migration `20260722000001_knowalong_sources.sql` line 170 defines `source_lines.translation text` with a COMMENT:

> "User or analysis-generated translation into translation_language. Always visibly labelled, never as source."

This column is the destination for `line_translation` proposal acceptance (UPDATE on the existing column). No schema change is required in migration 009 for this acceptance path.

### 6.4 S8 carve-out additions

`eslint.structure.config.js` S8 carve-out list gains `utils/companion/companionClient.ts` with a narrow justification comment (raw fetch is required for SSE-over-fetch; fetchWithRetry wraps fetch with retry/timeout but SSE needs a long-lived streaming fetch that must NOT be timed out or retried mid-stream).

### 6.5 ESLint ignores

`tools/**` added to `eslint.structure.config.js` ignores with a justification comment (companion is a separate Bun-only runtime, not subject to PWA structural rules).

---

## 7. Proposal-kind acceptance matrix (Revision 3 — authoritative)

| Proposal kind | Destination on accept | Required accepted dependencies | Outcome |
|---|---|---|---|
| `section` | `source_sections` | source exists | Writes one row preserving exact line boundaries/ordinals. Mark proposal `accepted` only after write succeeds. |
| `segment` | **NO destination in this checkpoint** | — | Accept button DISABLED with reason "Segment promotion is deferred until atomic multi-record promotion is available." Proposal remains reviewable, editable, rejectable, exportable. Schema ships in 005 but NO repository write method and NO acceptance path. |
| `line_translation` | `source_lines.translation` UPDATE | source line exists | Updates existing translation column. Mark `accepted`. If proposal references a non-existent line, Accept is disabled with "blocked — prerequisite missing." |
| `token_occurrence` | **NO destination in this checkpoint** | — | Accept button DISABLED. Reviewable/editable/rejectable/exportable. Documented as deferred. |
| `lemma` | `lexical_lemmas` | language_code + normalized_lemma not already present for this user | Deduplicate by `unique(user_id, language_code, normalized_lemma, part_of_speech)`. If the lemma already exists, link instead of duplicating; mark `superseded`. |
| `form` | `lexical_forms` | accepted/existing lemma | Morphology must be structured (not opaque). Reject if `morphology_summary` is empty. **`form` is an accept target for FORM proposals only (a row in `lexical_forms`). It is NOT a generated-card target — see the `card` row.** |
| `morphology` | `lexical_forms.morphology_summary` UPDATE | accepted/existing form | If no form referenced, Accept is DISABLED with "blocked — prerequisite missing." |
| `grammar_pattern` | `grammar_patterns` | source context optional; may target a Core Concept and/or lemma when accepted/existing | Target Core Concept MUST already exist in `core_concepts` (seeded; never client-created). |
| `concept_mapping` | `lemma_concept_links` | accepted/existing lemma AND existing Core Concept | NEVER creates a new canonical Core Concept. If proposed code doesn't exist, Accept is DISABLED. |
| `card` | `study_cards` | explicit target required (lemma / Core Concept / realization / grammar_pattern depending on `card_kind`); source context (line/segment/section) as appropriate | Source-derived cards MUST reference `source_line_id`. Generated (`generated_transfer`) MUST have `generated_content=true`, a `difficulty_budget`, and at least one of: `lexical_lemma_id`, `target_core_concept_id`, `target_realization_id`, `grammar_pattern_id`. **`form` is NOT a generated-card target in this checkpoint.** `source_segment_id` is context only and does NOT satisfy the target requirement. |
| `realization` | **NO destination in this checkpoint** | — | Accept button DISABLED. Reviewable/editable/rejectable/exportable. |

**Rules:**

- A proposal whose prerequisites are missing shows "blocked — prerequisite missing" with a link to the prerequisite proposal (when applicable). Its Accept action is disabled.
- A proposal whose destination is deferred shows "deferred — <reason>" with the literal reason from the matrix. Its Accept action is disabled.
- Batch acceptance iterates independently, skips blocked and deferred proposals, and returns per-proposal outcomes: `{ results: Array<{ proposalId, status: 'accepted'|'write-failed'|'blocked'|'deferred'|'rejected', reason? }> }`. No all-or-nothing claim. No automatic dependency acceptance.
- Acceptance of a child NEVER silently accepts missing parents.
- No placeholder normalized tables are created merely to claim all kinds can be accepted.
- No client-side rollback mechanism is called "atomic." Single-row destinations are atomic per-row at the Postgres level. Multi-table destinations are NOT promoted in this checkpoint.

**Test coverage:** `__tests__/knowalong/proposalReview.test.ts` asserts `deferredReasonFor` returns literal reasons for `segment` / `token_occurrence` / `realization` and `null` for every single-row destination kind.

---

## 8. Multi-line source-segment span model

```
source_segments
─────────────────────────────────────────────────────────────
  id                       uuid PK
  user_id                  uuid NOT NULL
  source_id                uuid NOT NULL → learning_sources
  source_section_id        uuid NULL → source_sections (optional)
  ordinal                  integer NOT NULL          (source-level, unique per source)
  segment_kind             text NOT NULL CHECK ∈ sentence/clause/phrase/
                                                      refrain_fragment/annotation/other
  assembled_display_text   text NOT NULL              (concatenation of ordered line fragments)
  display_text_checksum    varchar(64) NOT NULL       (sha256 of assembled_display_text)
  label                    text NULL
  source_run_id            uuid NULL → analysis_runs  (added in migration 009)
  created_at / updated_at  timestamptz
  UNIQUE(source_id, ordinal)
  Owner-only RLS via direct user_id.
  NO source-level start/end offset columns.
```

```
source_line_segments  (the span — multi-line aware; sole authoritative span)
─────────────────────────────────────────────────────────────
  source_line_id       uuid NOT NULL → source_lines  (cascade)
  source_segment_id    uuid NOT NULL → source_segments (cascade)
  ordinal              integer NOT NULL              (position within the segment)
  start_offset         integer NULL                  (char offset into THIS line's raw_text)
  end_offset           integer NULL                  (char offset into THIS line's raw_text)
  line_fragment        text NULL                     (exact substring; nullable when whole line)
  created_at           timestamptz
  UNIQUE(source_line_id, source_segment_id)
  UNIQUE(source_segment_id, ordinal)
```

**Reconstruction rule:** a segment's display text is deterministically rebuilt by concatenating its ordered `source_line_segments` rows' `line_fragment` (or full `source_lines.raw_text` when `line_fragment IS NULL`), joined by `\n`. The rebuilt text MUST match `assembled_display_text` (verified by `display_text_checksum`). Companion emits a warning event on mismatch and drops the segment.

**Validation:** per-line `start_offset`/`end_offset` must satisfy `0 ≤ start_offset ≤ end_offset ≤ length(source_lines.raw_text)` for that specific line.

**Promotion status:** tables ship in migration 005. Segment proposal promotion is NOT available in this checkpoint. The `sourceSegmentRepository` exposes `findBySource` and `deleteBySource` ONLY — no `createSegmentWithLineSpan`, no `create`, no `upsert`, no `insert`. Verified by `__tests__/knowalong/segmentSpan.test.ts`.

---

## 9. Deployed-HTTPS-to-loopback compatibility limitation

**Known limitation, documented explicitly:**

- Deployed PWA is HTTPS. Companion is loopback HTTP by default.
- Browser handling of secure-page-to-loopback-HTTP varies: mixed-content blocking, Private Network Access (PNA) preflight, per-browser policy.
- Setting CORS headers alone does NOT guarantee deployed HTTPS PWA → loopback HTTP companion.

**Error taxonomy (load-bearing):**

| Kind | Surfaced message | Detected via |
|---|---|---|
| `companion.unreachable` | "Companion not reachable. Is the local companion running on 127.0.0.1:8765?" | TypeError (same-origin / unknown) |
| `companion.mixed-content-blocked` | "Your browser may block HTTPS→HTTP loopback. Try the local dev origin, or run KnowAlong locally." | TypeError + https-page → http-url heuristic |
| `companion.unauthorized` | "Companion rejected the token. Re-paste the token from the companion banner." | 401 |
| `companion.origin-forbidden` | "Companion did not allow this origin. Add this PWA origin to the companion allowedOrigins list." | 403 |
| `companion.network-error` | Server message or "Companion responded with status N." | Other non-OK status |
| `companion.timeout` | "Companion request timed out." | AbortController fired by timeout |

**Tested path:** local development origin (`http://localhost:8081` / `http://127.0.0.1:8081`).

**Deferred item:** deployed-PWA-to-loopback compatibility hardening. Do NOT add self-signed TLS, certificate management, local HTTPS proxying, broad CSP relaxations, or insecure-content workarounds in this checkpoint.

---

## 10. CLCC routes — temporary unlinked internal operator surface

The CLCC routes (`app/clcc.tsx`, `app/clcc/[runId].tsx`) are:

- **NOT a learner feature.** They do not appear in learner navigation.
- **NOT protected admin authorization.** They are reachable during local/operator development by direct route. URL obscurity is NOT authorization.
- **NOT able to publish language packs.**
- **NOT able to promote candidates into canonical shared realizations.** Promotion into `concept_realizations` is deferred.

They are a **temporary unlinked internal operator surface** in the KnowAlong repository, retained only for local candidate generation, review, and export while the learner-facing source-analysis workflow is validated.

They will be **extracted or replaced by the separate future KnowAlong Studio admin application** after the learner/source-analysis and bridge-deck workflow have been validated.

**CLCC language scope:** French / Russian / Persian (fa) ONLY in this checkpoint. Adding a language requires updating the Zod schema allowlist AND the companion pipeline's prompt catalogue.

---

## 11. Deferred-work list

| Item | Status | Reason |
|---|---|---|
| Segment proposal promotion | Deferred | Requires atomic multi-record promotion (transaction/RPC). Schema ships in 005 so a future approved path can write without another migration. |
| Lexical form as generated-card target | Deferred | The CHECK constraint and the matrix disagreed; "form" had no matching target column. Chose the narrower consistent rule. |
| CLCC promotion into `concept_realizations` | Deferred | Belongs in the separate KnowAlong Studio admin application (reviewed import, versioned language-pack releases, secure server-side cloud jobs). |
| Source-level segment offsets | Removed | Two competing span systems invited ambiguity. Ordered `source_line_segments` is the sole authoritative span. |
| True atomic multi-record promotion | Deferred | No RPC / Edge Function / remote transaction in this checkpoint. Per-proposal independent acceptance only. |
| Deployed-HTTPS-to-loopback compatibility hardening | Deferred | Mixed-content / PNA per-browser variance. No TLS/cert/proxy workarounds in this checkpoint. |
| Languages beyond fr/ru/fa | Deferred | Out of checkpoint scope. |
| AnkiConnect/export | Deferred | Future vertical. |
| Full FSRS scheduling | Deferred | Review loop is provisional/preview only. |
| The separate future KnowAlong Studio admin application | Deferred | Reviewed import, versioned language-pack releases, secure server-side cloud jobs, learner read-only consumption. The current CLCC routes will be extracted or replaced by it. |

---

## 12. Revision trail

### Revision 1 → Revision 2 (corrections A–G)

| # | Area | Change | Reason |
|---|---|---|---|
| A | Migration FK ordering | `source_run_id` added in 009 (after 006 creates `analysis_runs`), not inline in 005/008. | Postgres can't create an FK to a not-yet-existing table. |
| B | Live progress transport | SSE-over-authenticated-`fetch()` replaces native `EventSource` (which can't authenticate). S8 carve-out added. | Native EventSource cannot authenticate safely. |
| C | Proposal acceptance | Full per-kind acceptance matrix. Several kinds have Accept DISABLED. No placeholder tables. | Not every kind has a safe destination. |
| D | Source-segment span model | Per-line `source_line_segments` is authoritative; source-level offsets advisory/nullable. | Multi-line segments need a per-line span table. |
| E | HTTPS-to-loopback compatibility | Explicit limitation documented; specific error taxonomy. | Mixed-content/PNA blocks CORS-only assumption. |
| F | Companion package reproducibility | Strategy A/B/C chosen in Phase 0 based on probe. | Don't depend accidentally on hoisted packages. |
| G | S8 carve-out | `utils/companion/companionClient.ts` added. | Raw fetch required for SSE-over-fetch. |

### Revision 2 → Revision 3 (corrections H–M)

| # | Area | Revision 2 said | Revision 3 says | Reason |
|---|---|---|---|---|
| H | Segment proposal promotion | `createSegmentWithLineSpan` atomic write; matrix says "writes segment + line links atomically." | NO `createSegmentWithLineSpan`. NO acceptance path. Accept DISABLED with specific reason. Schema still ships in 005. | Client-side Supabase/PostgREST writes from separate repository calls are not guaranteed transactional; this checkpoint excludes adding RPC/transaction; calling best-effort sequences "atomic" is false. |
| I | Generated-card target set | Matrix says card can target lemma / form / Core Concept / realization / grammar_pattern. | Generated-transfer card can target lemma / Core Concept / realization / grammar_pattern ONLY. `form` removed. | CHECK constraint and matrix disagreed; chose the narrower consistent rule. |
| J | Source-level segment offsets | `source_segments` has nullable source-level offsets described as "advisory." | `source_segments` has NO `start_offset` and NO `end_offset`. Ordered `source_line_segments` is the sole authoritative span. | Two competing span systems invite ambiguity. Remove is the cleaner MVP choice. |
| K | `line_translation` destination | Asserted (without inspection) that `source_lines.translation` exists. | INSPECTED in plan mode. Column exists with a COMMENT that anticipates analysis-generated translations. Phase 0 reconfirms. | Verify, don't assume. |
| L | Study-card constraint discovery | Migration 009 uses a `DO $$ ... $$` block to discover the constraint name at run time. | Migration 009 uses the LITERAL name confirmed by Phase 0 inspection (`study_cards_check1`). No dynamic DO block. | Runtime discovery based on text matching is fragile; constraint name is deterministic from migration order. |
| M | SSE diagram wording | "HTTPS-not-TLS, loopback only, bearer-authenticated." | "HTTP loopback transport, bearer-authenticated." HTTPS-to-loopback compatibility limitation is documented separately. | Original wording conflated the loopback transport with the deployed-PWA-to-loopback question. |

---

## 13. Test coverage matrix

| Test file | Load-bearing assertion |
|---|---|
| `__tests__/knowalong/companionSchemas.test.ts` | Zod schema validation; source-analysis does NOT restrict to fr/ru/fa but CLCC DOES; empty arrays rejected. |
| `__tests__/knowalong/proposalReview.test.ts` | `deferredReasonFor` returns literal reasons for `segment` / `token_occurrence` / `realization` and `null` for every single-row destination kind. |
| `__tests__/knowalong/segmentSpan.test.ts` | Multi-line reconstruction from `source_line_segments`; per-line offset validation; `sourceSegmentRepository` exposes NO write method. |
| `__tests__/knowalong/companionCredential.test.ts` | Paste/save/clear lifecycle; NO client-side token generation; trims whitespace; rejects empty/schemeless values. |
| `__tests__/knowalong/companionErrorTaxonomy.test.ts` | All 6 CompanionConnectionError kinds recognized; rejects null/undefined/plain Error/primitives/non-companion kinds. |
| `__tests__/knowalong/companionClient.test.ts` | Authorization header always present on authenticated requests; token never in URL/event-id/payload; Last-Event-ID honored; heartbeat handling; AbortController close; taxonomy classification; history-truncated. |
| `__tests__/knowalong/localAnalysisService.test.ts` | Taxonomy kind round-trips into `failure_reason`; success path transitions queued → connecting; ingestEvents dedupes by ordinal; no `succeeded` status. |
| `__tests__/knowalong/clccGenerationService.test.ts` | Same shape as localAnalysisService; no promotion method exposed; only start/ingestEvents/finalize/fail/cancel/deleteRun. |
| `__tests__/knowalong/deleteRun.test.ts` | Delete removes run + events + proposals; does NOT remove unrelated runs or accepted curated rows; no `deleteAll` / `truncate` / `drop` on repository. |
| `__tests__/knowalong/constraintNameInspection.test.ts` | Live-DB only (skipped under DEMO_MODE). Asserts literal constraint name `study_cards_check1` matches migration 009 STEP C. |
| `tools/local-companion/__tests__/*.test.ts` | 8 Bun test files: router, cors (5 cases), jobManager (no `succeeded` terminal), sse (replay/dedupe/heartbeat/clean close), pipelines (stage order/retry/warning-on-fail), ollamaAdapter, tokenLifecycle, config. |

---

## 14. Validation commands (Phase 8 — run before commit, then STOP)

```bash
cd knowalong
bun install
bun run lint:structure               # 12 audits + structural ESLint (with tools/** ignore + companionClient carve-out)
bunx tsc --noEmit                    # root typecheck (Strategy A — covers companion)
bun test tools/local-companion       # companion Bun tests
bun run test:run                     # vitest PWA suite (706 passing, 1 skipped under DEMO_MODE)
bun run verify:web-build             # static export smoke
bunx supabase db lint                # if CLI available
# Clean-clone validation (Gate 2):
git worktree add /tmp/knowalong-clean -b clean-clone-probe
cd /tmp/knowalong-clean && bun install && bunx tsc --noEmit && bun test tools/local-companion && bun run test:run
cd - && git worktree remove /tmp/knowalong-clean
```

Commit locally with conventional message. **STOP. Do not push. Do not `supabase db push`.** Push is approval-gated because this checkpoint is migration-bearing.
