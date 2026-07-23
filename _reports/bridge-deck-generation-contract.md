# Bridge Deck Generation Contract (ADR)

> Durable decision record for the KnowAlong bridge deck: what a bridge deck is, what every generator must accept as input, what every generated card must carry, and the sequencing rules a deck obeys. Self-contained — no sibling-repo names, no workspace paths, no private provenance. Anticipated by `_reports/learner-studio-clcc-boundary.md` decision 5 ("Future bridge-card contract"); this is the named separate decision record.

## Status

Accepted. Applies to every future bridge-deck generator checkpoint. No generator exists today; this contract is the target specification that any future implementation — and the supporting migration — must satisfy. The first generator that lands requires a separately approved migration adding the deck-level and sequence-metadata fields listed in §9.

## Context

A bridge deck is the unit that turns one exact source line or segment into a personal learner path: a sequence of source-grounded and clearly labelled generated-practice cards that moves the learner from known or introduced building blocks toward understanding that one exact source line. Without a contract recorded before any generator exists, three forces risk corrupting the deck:

1. **Source-vs-generated blurring.** A deck that mixes exact source text into generated practice — or lets generated text quote source — breaks the load-bearing distinction enforced by the lyrics-domain ADR and the M3 card-safety rule.
2. **Unbounded generation.** Without a per-card single-burden rule and an explicit transformation allowlist, a generator can emit fluent-looking sentences that introduce untracked lexical or grammar targets, defeating the deck's purpose as a controlled path.
3. **Unreviewed claims as established fact.** A deck that builds on analysis proposals still in `pending` review state — or on unpublished CLCC candidates — silently promotes untrusted material into the learner's accepted study path.

This contract records the binding definition, inputs, outputs, per-card metadata, sequencing rules, exclusions, future-generator acceptance criteria, an illustrative scaffold, and an explicit non-implementation mapping that names what already supports the contract, what is absent and requires a later migration, and what can be represented temporarily in proposal/card metadata. No schema changes land in this checkpoint.

## Decision matrix

### 1. Bridge deck — definition

**Decision:** A bridge deck is a personal sequence of source-grounded and clearly labelled generated-practice cards that moves a learner from known or introduced building blocks toward understanding one exact source line or source segment.

**Why:** "Exact source objective" pins the deck to one accountable target. "Source-grounded" keeps the deck tethered to the learner's material. "Clearly labelled generated-practice" preserves the source-vs-generated distinction (M3). "Personal" means a deck is tied to one learner's accepted analysis and known/mastered state; it is not a shared artefact. "Known or introduced building blocks" makes the deck a path, not a test: each step assumes what prior steps established.

**Consequence:** A deck is uniquely identified by (learner, source objective, language-pack version). Two learners with the same source line and the same pack version produce two decks; the same learner with a newer pack version produces a new deck, not a mutation of the old one. Decks are immutable once generated except for review outcomes on their cards.

### 2. Inputs (required)

**Decision:** Every deck generator accepts exactly these inputs:

- **Exact source objective** — a source ID plus a line ID or segment ID. The single accountable target the deck moves toward.
- **Target and support languages** — the target language of the source line and the support language the learner reads glosses/translations in.
- **Published language-pack version ID** — a version from a language pack in `published` state only. Draft, reviewed, or retired packs are rejected.
- **Accepted learner analysis only** — analysis proposals in `accepted` state for the source objective. Pending, rejected, or absent proposals contribute nothing.
- **Known/mastered targets when available** — the learner's current evidence-level state for lexical, grammar, and CLCC-realization targets relevant to the objective. Used to skip already-known burdens and to pick the first new burden to introduce.
- **Selected lexical, grammar-pattern, and CLCC-realization targets** — the targets declared in the pack version's scope for this objective, narrowed by what the learner has already encountered.
- **Learner difficulty ceiling/budget** — the upper bound on the difficulty budget the deck may spend across its generated cards. The deck's total spend must not exceed this ceiling.

**Why:** Naming the input set before any generator exists keeps the generator honest: it cannot invent inputs, cannot read pending analysis, cannot pull from unpublished packs, and cannot exceed the learner's declared ceiling.

**Consequence:** A deck is reproducible from these inputs and the pack version. The same inputs plus the same pack version produce the same deck (modulo review outcomes).

### 3. Output categories

**Decision:** A deck consists of exactly these card categories:

- **Source-recognition cards** — source-derived cards (`source_recognition` kind) that surface the exact objective line for first encounter. Generated-content flag false; `source_line_id` required.
- **Source-cloze / source-production cards when appropriate** — source-derived cards (`source_cloze` / `source_production`) that test recognition or production of the exact line. Generated-content flag false; `source_line_id` required. Optional, included only when the objective line is short enough to cloze meaningfully.
- **Generated bridge cards** — the path. Each carries `generated_content = true`, declares its targets and transformation set within the difficulty budget, and never includes exact source text.
- **Final source-approach card** — the last card of the deck. Moves toward the original exact source objective by surfacing the exact source line in full, in source-derived form (`generated_content = false`, `source_line_id` set). The deck's terminal step is the source, not a generated approximation.
- **No unlabeled generated content.** Every card either carries `generated_content = false` (source-derived) or `generated_content = true` (generated practice). There is no third category. A card that cannot be classified into one of these two cannot enter a deck.

**Why:** The categories mirror the existing M3 source-vs-generated safety rule so the deck rides existing enforcement rather than inventing a parallel one. The terminal source-approach card keeps the deck honest: the deck is always a path *to* the source, not a replacement for it.

**Consequence:** A deck with zero generated bridge cards is valid only if the source line itself requires no scaffolding (already entirely within the learner's known set). The default deck has at least one generated bridge card.

### 4. Required metadata for every generated bridge card

**Decision:** Every generated bridge card carries, at minimum:

- **Generated-practice provenance** — the generator identity, the generator version, and the deck ID. The card is visibly tagged as generated practice.
- **Source objective** — the source ID + line/segment ID the deck targets. Preserved on every card in the deck so provenance cannot drift mid-deck.
- **Language-pack version ID** — the published pack version used to generate this card. Frozen at generation time.
- **Explicit targets** — the lexical, grammar-pattern, and/or CLCC-realization targets the card exercises. A card with no declared targets is invalid.
- **Difficulty budget and actual assessment** — the per-card budget allocated by the generator and the actual assessed difficulty after generation. The two must be reconcilable.
- **Prerequisite target IDs** — the target IDs the card assumes the learner already has at `encountered` or higher. Cards must be ordered so a target is `encountered` before it is exercised as a prerequisite.
- **Sequence reason / rationale** — a short machine-readable reason explaining why this card sits at this position. Used for deck reconstruction and review.
- **Deterministic ordinal** — a stable integer that fixes this card's position in the deck. Two runs of the generator with identical inputs produce identical ordinals.

**Why:** Without these fields a deck cannot be reconstructed, audited, or reviewed. Each field maps to a concrete reviewer question: "where did this come from?" (provenance), "what is it teaching?" (targets), "how hard was it supposed to be?" (budget), "what did the generator think it was building on?" (prerequisites), "why here?" (rationale), "is this the same deck I had yesterday?" (ordinal).

**Consequence:** A generated bridge card missing any of these eight fields is rejected at the contract boundary. The generator cannot ship partial cards.

### 5. Binding sequencing rules

**Decision:** The following rules are binding on every deck:

1. **One new primary burden per card.** A bridge card introduces at most one new primary learning burden. A burden is one of: a lexical target, a grammar-pattern target, a CLCC realization, or a controlled sentence transformation. A card may exercise any number of *already-known* burdens as context; only the new one counts as the card's burden.
2. **Earlier cards support later cards.** A burden introduced in card *n* may be exercised (not re-introduced) in card *n+k* without re-counting as new.
3. **The final source-approach card moves toward the original exact source objective.** It surfaces the exact source line. The deck's terminal step is the source, not a generated approximation that "feels close enough".
4. **Exact source text remains separate from generated practice.** Source text appears only on source-derived cards (`generated_content = false`). Generated bridge cards may not quote, cloze, or paraphrase exact source text.
5. **A generated sentence cannot include an untracked lexical or grammar target outside its allowed budget.** Every lexical token and every grammatical construction exercised by a generated sentence must trace to a declared target in the pack version or to a prerequisite target at `encountered` or higher. Undeclared targets invalidate the card.
6. **Permitted transformations must be explicitly declared and traceable.** A generated sentence that transforms a source-shape or pack-shape must declare its transformation set. The permitted transformation kinds are: person, number, tense/aspect, negation, location, possession, agency/passive-result relationship, and any other target-language transformation documented in the pack version. Transformations outside the declared set invalidate the card.
7. **Budget reconciliation.** The sum of actual assessed difficulties across generated bridge cards must not exceed the learner's declared difficulty ceiling. The generator may underspend; it may not overspend.

**Why:** These rules are what makes a deck a *path* rather than a worksheet. Without rule 1 the deck can introduce five burdens per card and the learner cannot tell what they are learning. Without rule 5 the deck can silently teach vocabulary the learner has never seen. Without rule 6 the deck can quietly perform transformations the pack never authorized. Rules 1–6 together make a deck auditable; rule 7 makes it bounded.

**Consequence:** A deck that violates any of rules 1–7 is non-compliant and rejected at the contract boundary. The generator implementation is responsible for emitting only compliant decks; the consumer (review UI, storage, replay) is responsible for enforcing compliance on read.

### 6. Exclusions

**Decision:** The following are explicitly excluded from bridge decks:

- **No generic free-form sentence generation.** Every generated sentence must trace to declared targets and a declared transformation set within the budget. "Write a sentence using the word X" is not a deck card.
- **No automatic learner acceptance.** Every generated bridge card enters the learner's deck in `pending` review state. The learner reviews and accepts, rejects, or defers each card. There is no auto-accept path.
- **No use of unreviewed analysis claims as established facts.** Only `accepted` analysis proposals feed the deck. Pending proposals are invisible to the generator.
- **No unpublished CLCC candidates.** Only `published` language-pack versions. Draft, reviewed, or retired versions are rejected at the input boundary.
- **No fluency / CEFR certification claims.** A deck is a personal study aid, not a proficiency credential. The deck does not certify, place, or rank the learner. Marketing copy that implies otherwise is a bug.

**Why:** Each exclusion closes a concrete failure mode the prior ADRs anticipated: free-form generation defeats the target-tracking that makes the deck auditable; auto-accept defeats M7's proposal-first review; unreviewed analysis promotes speculation to fact; unpublished candidates bypass the editorial pipeline the Studio boundary ADR established; certification claims turn a study aid into a credential it is not designed to be.

**Consequence:** A generator or consumer that does any of the above is non-compliant. "Approximate compliance" is not a category.

### 7. Future-generator acceptance criteria

**Decision:** Any future bridge-deck generator must satisfy the following to be accepted into the tree:

1. **Deterministic rejection of missing fields.** The generator rejects any card missing provenance, source objective, pack version, targets, or difficulty budget. The rejection is logged with the specific missing field.
2. **Generated cards visibly render as generated practice.** The review UI labels every generated bridge card as "Generated practice" (per M3). Source-derived cards retain their source-derived labelling. The two are visually distinct.
3. **Source cards retain exact source links.** Source-derived cards in the deck carry `source_line_id`. Clicking a source card surfaces the exact source line in its original context.
4. **A deck can be reconstructed from its stored metadata and pack version.** Given (learner, source objective, pack version, deck ID), the deck's cards and their ordering can be replayed from stored metadata alone, without re-invoking the generator.

**Why:** These criteria are the contract's enforcement surface. A generator that cannot satisfy them is not a bridge-deck generator under this contract; it is some other kind of generator and needs a different ADR.

**Consequence:** The first generator checkpoint must demonstrate all four criteria on the illustrative scaffold in §8 (or an equivalent scaffold) before the generator is eligible for review.

### 8. Illustrative scaffold — Russian, target meaning "I was raised by the streets."

This scaffold uses English glosses and original non-copyrighted generated sentences. No real lyric is reproduced. The scaffold illustrates one compliant deck; other decks for the same objective are valid if they obey §5.

The target source line (exact source text, shown only on the final source-approach card): *I was raised by the streets.*

| Ordinal | Card kind | Sentence (English gloss of the Russian the learner would see) | Burden introduced this card | Why this position |
|---|---|---|---|---|
| 0 | source-recognition | (exact source line shown for first encounter — no generated sentence) | none — first encounter | Surfaces the objective so the learner knows what the deck is building toward. |
| 1 | generated bridge | "There are streets there." | **Lexical: streets + existential/locative construction.** | Introduces the target noun in its simplest frame (existential) before any agent structure. |
| 2 | generated bridge | "Dogs are in the streets." | **Lexical: an animate noun in the locative.** | "Streets" is now known; the new burden is placing an animate entity in the location. |
| 3 | generated bridge | "The dog was raised by him." | **Grammar-pattern: passive-result (raising) voice with an agent phrase.** | Introduces the target construction ("was raised by X") using known locative vocabulary and a simpler agent noun. |
| 4 | generated bridge | "I was raised here." | **Grammar: first-person subject + proximate adverb in the passive-result frame.** | Reuses the now-known passive-result construction; the new burden is the first-person subject and proximate-location adverb. |
| 5 | final source-approach | (exact source line: *I was raised by the streets.* — source-derived, not generated) | **Metaphorical agent phrase: streets as agent of raising.** | The deck's terminal step. The new (and only remaining) burden is the figurative leap — treating "the streets" as the agent of "raised". Everything else in the line is now known. |

**Notes on the scaffold:**

- Each generated card (ordinals 1–4) declares its targets, transformation set, prerequisite target IDs, difficulty budget, and actual assessment per §4.
- The transformation set for ordinals 3 and 4 includes the **agency / passive-result** transformation (§5 rule 6). The transformation set for ordinal 4 additionally includes **person** (third → first) and **location** (distal → proximate).
- The total difficulty budget across ordinals 1–4 must not exceed the learner's declared ceiling. If the ceiling is tight, the generator may drop ordinal 2 (the lowest-information step) and still produce a compliant deck.
- Ordinal 5 is source-derived, not generated; it does not count against the difficulty budget.
- "Dogs" in ordinal 2 is a deliberate generic animate noun, chosen so that ordinal 3's "The dog was raised by him" has a clean antecedent. A different pack version might use a different generic animate noun.

### 9. Non-implementation mapping

This section records what supports the contract today, what is absent, what can be represented temporarily, and what does NOT land in this checkpoint. **No schema changes land in this checkpoint.**

**What already supports the contract (today, no migration needed):**

- `study_cards` table with `generated_content` boolean (M3 source-vs-generated safety rule).
- `source_line_id` reference on source-derived cards.
- `generated_transfer` card kind with target references: `lexical_lemma_id`, `target_core_concept_id`, `target_realization_id`, `grammar_pattern_id`.
- `difficulty_budget` field on `study_cards`.
- `source_readiness_snapshots` for known/mastered state (§2 input "known/mastered targets").
- `analysis_proposals` with `status` lifecycle (`pending` → `accepted`/`rejected`); §2 input "accepted learner analysis only".
- Published CLCC language-pack lifecycle (`draft → reviewed → published → superseded/retired`) defined in the Learner-Studio-CLCC boundary ADR.
- `CALCULATION_VERSION` for versioning.
- `source_segments` and ordered `source_line_segments` for segment-level objectives.

**Absent — would require a later separately approved migration:**

- `bridge_deck` table — none exists. Would need: deck ID, learner ID, source objective ref (line or segment), language-pack version ID, difficulty ceiling, deterministic deck ordinal seed, creation timestamp.
- `bridge_card` sequence fields — `sequence_ordinal`, `prerequisite_target_ids[]`, `sequence_rationale`, `introduced_burden_kind` (lexical / grammar / clcc-realization / transformation), `introduced_burden_ref` (the target ID the card introduces).
- `language_pack_version_id` reference field on generated cards — frozen-at-generation reference to the published pack version.
- `transformation_set` — declared permitted transformations per card (or per pack version). Needs an enum or array column tied to the §5 rule 6 allowlist.
- `actual_assessment` — per-card field recording the assessed difficulty after generation, for §5 rule 7 budget reconciliation.
- Deck reconstruction key — a stored hash or signature so a deck can be replayed from stored metadata + pack version (§7 criterion 4) without re-invoking the generator.

**What can be represented temporarily in proposal/card metadata:**

Until the §9 "Absent" migration lands, a generator prototype may carry contract fields in JSON metadata on `analysis_proposals` or `study_cards`. Specifically:

- Sequence ordering → `metadata.bridge_ordinal` (integer).
- Prerequisite target IDs → `metadata.bridge_prerequisites` (array of target IDs).
- Sequence rationale → `metadata.bridge_rationale` (string).
- Introduced burden → `metadata.bridge_burden_kind` + `metadata.bridge_burden_ref`.
- Permitted transformations → `metadata.bridge_transforms` (array of transformation-kind strings from the §5 rule 6 allowlist).
- Language-pack version → `metadata.bridge_pack_version` (string, until the FK column lands).
- Actual assessment → `metadata.bridge_actual_assessment` (numeric).

Metadata representation is a temporary scaffold for prototyping only. The contract's acceptance criteria (§7) require the formal fields before any generator leaves prototype stage. A prototype that uses metadata representation must still obey all sequencing rules (§5) and exclusions (§6).

**No schema changes now:** This checkpoint is documentation-only. The first generator checkpoint that needs persistence must land the §9 migration in the same change window and update this ADR's revision trail.

### 10. Explicit non-goals (this checkpoint)

- No generator implementation. The contract names what a generator must do; it does not build one.
- No schema migration. The §9 "Absent" list names what a future migration carries; nothing lands now.
- No CLCC language-pack publication. The contract consumes published packs; it does not publish them.
- No change to the M3 source-vs-generated card safety rule, the M7 proposal-first review rule, or the M8 CLCC deferral.
- No change to the Learner-Studio-CLCC boundary.
- No UI for reviewing bridge decks. The contract defines the deck's shape; the review UI is a later checkpoint.

## Revision trail

| # | Date | Change |
|---|---|---|
| 1 | 2026-07-22 | Initial. Bridge Deck Generation Contract recorded: definition, inputs, outputs, per-card metadata, binding sequencing rules, exclusions, future-generator acceptance criteria, Russian illustrative scaffold (target meaning "I was raised by the streets"), non-implementation mapping. Anticipated by `_reports/learner-studio-clcc-boundary.md` decision 5; this is the named separate decision record. No schema changes; no generator implementation. |
