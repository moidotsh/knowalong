# Learner PWA, KnowAlong Studio, and published CLCC language packs (ADR)

> Durable product-boundary decision record for the KnowAlong product line. Self-contained — no sibling-repo names, no workspace paths, no private provenance. Records the load-bearing ownership, data, lifecycle, and rollout decisions that span the Learner PWA, the future KnowAlong Studio, and published CLCC language packs.

## Status

Accepted. Applies to all KnowAlong checkpoints from the local-analysis/CLCC revision onward. Subsequent product milestones (Studio first vertical slice, CLCC publishing pipeline, additional language packs) extend or supersede individual decisions; this ADR is the revision-trail anchor for the boundary between the two products and the published-content lifecycle.

## Context

KnowAlong has reached the point where two distinct product surfaces must be named and separated before any further vertical lands:

1. **KnowAlong Learner** — the mobile/PWA-first learner product that exists today. It owns private learner-entered sources, exact source lines, personal analysis output, and personal study material. Source analysis is optional, local-first (via the loopback companion), and reviewable per-proposal.
2. **KnowAlong Studio** — a later separate desktop-first admin product. Studio will own shared CLCC candidate intake, editorial review, QA, versioned language-pack releases, catalogue operations, future secure server-side cloud jobs, provider credentials, and privileged publication.

Two structural forces make the boundary load-bearing now, not later:

- **The current CLCC routes** (`app/clcc.tsx`, `app/clcc/[runId].tsx`) ship in the Learner PWA repository as a temporary unlinked internal operator surface for local candidate generation, review, and JSON export. Without a recorded boundary, the next checkpoint risks treating them as either a learner feature or as the publishing authority — both are wrong.
- **The published CLCC language-pack lifecycle** (`draft → reviewed → published → superseded/retired`) must be defined before the first pack (`ru-0.1`) ships, so the learner read-only consumption path and the Studio publishing path can be built against the same shape.

This ADR records seven binding decisions and an explicit non-goals list.

## Decision matrix

### 1. Product ownership — Learner PWA

**Decision:** KnowAlong Learner is the mobile/PWA-first learner product. It owns private learner-entered sources, exact source lines, private source analysis, accepted personal learning material, personal cards, review history, and learner progress. Source analysis remains opt-in, local-first, reviewable, provenance-aware, and visibly distinguishes exact source text from analysis and generated practice. Learners do not generate, curate, promote, or publish canonical CLCC language content.

**Why:** Private learner content and canonical shared content have different trust models, different lifecycle requirements, and different product owners. Mixing them in one product surface forces every learner-facing decision to carry catalogue/publication weight. The local-first, opt-in, per-proposal reviewable analysis posture is what protects the learner's source relationship and the source-vs-generated distinction; weakening it is not on the table.

**Consequence:** Every learner-side data path treats the learner's own data as the authority and treats shared/published content as read-only inputs. The Learner PWA repository carries no CLCC publishing authority, no provider credentials, and no automated access to other learners' sources.

### 2. Studio boundary — separate admin product

**Decision:** KnowAlong Studio is a later separate desktop-first admin product. Studio will own shared CLCC candidate intake, editorial review, QA, versioned language-pack releases, catalogue operations, future secure server-side cloud jobs, provider credentials, and privileged publication. Studio must not automatically access or process private learner sources. The current `app/clcc.tsx` and `app/clcc/[runId].tsx` routes are temporary unlinked internal operator surfaces retained only for local candidate generation, review, and JSON export; they are not learner features, are not publishing authority, and are not access-control mechanisms. They are slated for extraction or replacement by Studio.

**Why:** Editorial review, QA, versioning, and secure cloud jobs require a different trust boundary, a different UX, and a different deployment posture than a learner PWA. Putting them in the Learner PWA repository would either leak privileged operations into learner-facing code or freeze the learner product behind admin concerns. The current in-repo CLCC routes exist only because Studio does not yet exist; recording their transitional status now prevents drift toward treating them as authoritative.

**Consequence:** When Studio lands, the in-repo CLCC routes migrate out (or are replaced by Studio-backed read API). Any new admin-only capability lands in Studio, not in the Learner PWA. Learner PWA commits that add privileged publication surfaces or cloud LLM credentials are out of scope by definition.

### 3. Data boundary — global/shared/admin vs. private/learner

**Decision:**

- **Global/shared/admin-written:** canonical Core Concepts, language-specific concept realizations, published language-pack versions, pack entries/tracks/release metadata/audit history.
- **Private/learner-written:** learning sources and exact lines, personal analysis runs/proposals, personal cards/reviews/progress, and generated bridge cards tied to a learner's source objective.
- **Private learner source material never becomes shared catalogue content by default.**

**Why:** Without a recorded boundary, a future checkpoint could "promote" learner material into the shared catalogue without an editorial review path — that would void the trust model on both sides. The boundary also makes the eventual Studio publishing pipeline and the learner consumption path buildable against a single, stable data classification.

**Consequence:** Promoting any private material into the shared catalogue requires an explicit editorial act that lives in Studio, not an automatic learner-side flow. Learner analysis output remains learner-owned even when it references shared Core Concepts or published realizations.

### 4. Language-pack lifecycle

**Decision:** `draft → reviewed → published → superseded/retired`. Published releases are immutable in practice; corrections create a new version. Learner consumption of a published release is read-only.

**Why:** Immutable published releases are what let learners trust that a deck they are studying today will not silently change tomorrow. Supersession (not in-place mutation) is the only correct way to fix an error in a published pack. Read-only learner consumption keeps the trust model simple: the learner either studies a published version or they do not.

**Consequence:** A future Studio correction flow produces a new version row and (optionally) marks the prior version superseded; it does not edit the prior version in place. Learner decks that reference a pack version continue to reference that version even after a newer one ships.

### 5. Future bridge-card contract

**Decision:** Each future generated bridge card retains its source objective/source context, lexical/grammar/CLCC targets, difficulty budget, generated-practice provenance, and language-pack version used.

**Why:** A bridge card is the unit that crosses the boundary between private learner material (the source objective) and shared CLCC content (the targets). Recording what each bridge card must carry — at decision level, before any generator exists — keeps both the generator and the consumer honest about provenance and versioning.

**Consequence:** Any future bridge-card generator implementation must populate the listed fields. This ADR does not define or implement the generator; that work is deferred to a later checkpoint and a separate decision record.

### 6. Rollout order

**Decision:**

1. Russian Pack `ru-0.1`.
2. Russian lyric-to-bridge-deck validation.
3. Studio first vertical slice.
4. French.
5. Persian.
6. Swedish.
7. Bosnian.

**Why:** Russian-first validates the full lyric → analysis → bridge-deck loop on a single language with rich morphology and a non-Latin script. The Studio slice lands once the learner-side loop is proven on Russian, so Studio's editorial/publishing pipeline has a real first pack (`ru-0.1`) to exercise. French and Persian follow because the current CLCC scope already supports them. Swedish and Bosnian are explicitly later — they expand the catalogue only after the core loop and Studio are validated.

**Consequence:** Adding a language out of this order requires revising this ADR. The current CLCC language scope (fr/ru/fa only) is retained until `ru-0.1` ships.

### 7. Explicit non-goals (now)

**Decision:** The following are explicitly out of scope for the current and immediately following checkpoints:

- Studio or Next.js implementation.
- Cloud LLM / provider integration.
- CLCC publishing / import.
- Migrations (beyond what has already shipped).
- Billing or entitlements.
- Bosnian / Swedish content expansion.

**Why:** Naming the non-goals now prevents accidental scope creep during the Russian-first validation and Studio first vertical slice.

**Consequence:** A checkpoint that lands any of the above requires either an explicit ADR revision or a separate decision record that supersedes the corresponding row.

## Revision trail

| # | Date | Change |
|---|---|---|
| 1 | Initial | Seven binding decisions recorded: product ownership, Studio boundary, data boundary, language-pack lifecycle, future bridge-card contract, rollout order, non-goals. |
