# Mastery-driven Lesson Generation (ADR)

> Durable decision record for how the KnowAlong **consumer app** generates
> lessons: every lesson is produced at runtime from the learner's current
> mastery, sized to that mastery, and capped on new-concept load. Self-contained
> but cross-linked — it is the **consumer-app-local, mock-data-first realization
> path** for `_reports/bridge-deck-generation-contract.md`, which remains the
> future server-side target once knowalong-studio + Supabase feed the spine.

## Status

**Accepted (Phase 0 — documentation only).** No code, no migration, no behavior
change lands in this checkpoint. The phased implementation in §7 begins in
later chats; each phase is a separately shippable checkpoint verifiable against
this doc. This mirrors the precedent set by `bridge-deck-generation-contract.md`,
which landed documentation-only ("No generator exists today; this contract is the
target specification").

The hard rules R1–R6 in §2 are **binding on every future generator checkpoint**
from the moment the first phase lands. A generated lesson that violates any of
them is non-compliant.

## Context

The consumer app teaches Russian through (a) CLCC / basic-word starter packs,
(b) an adaptive gradient, and (c) songs (today: Svetofor). The song path
recently moved from "drill a whole dense lyric line in one lesson" (rote
translation-memory) to an i+1 per-word *arc* model with a culminating line
(`utils/knowalong/songCurriculum.ts`, commit `8433ee5`). That shipped a **static**
assembler: arcs are hand-authored, and each section's lessons are pre-built at
module load (`utils/knowalong/fixtures/svetoforFullDeck.ts`).

Six directives now redirect the whole curriculum:

1. **Hard cap.** At most **2–3 new concepts per lesson** (target 2, ceiling 3).
   An inflected form — the same lemma in another grammatical case or tense —
   **counts as a separate concept** (e.g. `фантом` and `фантомом` are two
   concepts). CLCC + basic words stay the **majority** scaffolding. "Even if it
   takes 50 lessons to learn a chorus." This must be a **hard rule** in the
   project docs.
2. **Dynamic sizing.** A learner who skipped the CLCC/basic preliminaries gets a
   *larger* lesson pack (more scaffolding to teach first); as they acquire words,
   packs **shrink**.
3. **Dynamic generation.** Lessons are generated from the learner's **current
   knowledge level** — not pre-built.
4. **No pre-made lesson packs** — except *starter* CLCC/basic-word seed packs.
5. **Capture as a durable ADR** so implementation runs in **phases across
   chats**, accountable to the doc.
6. **Mock data now vs. downstream reality.** The spine (CLCCs + basic words)
   will eventually arrive from **knowalong-studio via Supabase**, not local
   fixtures; the design must not assume the fixtures are permanent.

**The adaptive Study path already does (3)** — `utils/knowalong/generateLesson.ts`
builds a lesson at runtime from mastery (warmup → drill → introduce →
consolidate). This ADR generalizes that precedent to **all** learning
(especially music), formalizes (1) and (2) as binding invariants, and isolates
(6) behind a seam.

### Relationship to `bridge-deck-generation-contract.md`

That contract already specifies the target server-side model: a deck is
*personal* (tied to one learner's known/mastered state), obeys **"one new
primary burden per card"** (§5 Rule 1), consumes the learner's known/mastered
targets as an input to skip known burdens and pick the first new one, spends
against a difficulty budget, and terminates in a source-approach card. It says
no generator exists yet.

This ADR is **not a replacement** for that contract. It is the consumer-app
realization path with three additions the contract does not state:

- a **lesson-level** concept cap (the contract caps at *card* level only);
- **dynamic sizing** (pack size ∝ missing scaffolding);
- an explicit **mock↔Supabase spine seam**.

Full bridge-deck-contract metadata (pack-version IDs, review states, provenance,
difficulty-budget reconciliation, `source_line_id` on every source-derived card)
is **deferred** until the Studio/Supabase spine is live (§7 Phase 6). Until then
the consumer app carries the *spirit* of the contract — one burden per card,
mastery-aware, source-approach culmination — without the server-side machinery.

## Decision matrix

### 1. The model (precise, on existing primitives)

**Decision:** Generation is expressed entirely in types and predicates that
already exist in the repo. No new runtime model is introduced; only a generator
that composes them.

- **Concept = a distinct surface form**, keyed by `wordKey` (`utils/knowalong/mastery.ts`).
  `wordKey(form) = form.trim()`. Two surface forms are two concepts:
  `фантом` (nominative) ≠ `фантомом` (instrumental). This is what makes R3
  (case/tense variants count separately) fall out for free — the mastery store
  already keys by surface form, not lemma.
- **Known = graduated.** A concept is known for a learner iff
  `classifyWord(mastery[wordKey(form)]) === 'graduated'`, i.e.
  `streak >= WORD_FADE_THRESHOLD` (=`5`). Unknown/new otherwise. The exact
  "is form X known?" predicate is therefore
  `mastery[wordKey(form)]?.streak >= 5`.
- **Lesson = a generated `LessonStep[]`**, fed unchanged to
  `components/knowalong/LessonRound.tsx` (props: `step`, `mastery`, and the
  record-correct/mistake/exposure callbacks). `LessonRound` does not know or
  care whether a step was authored or generated.
- **Arc = the lessons needed to graduate one target** (a lyric word, or the next
  CLCC/basic concept), each step wrapping the target in *already-known* context.
- **Culminating line = the full lyric line**, reachable only once every surface
  form in it is graduated (§5).

**Why:** Pinning the model to existing primitives means R1–R6 are enforceable by
composition, not by a parallel system. The mastery store, the fade threshold,
and `LessonRound`'s contract are the load-bearing surface; the generator is
logic over them.

**Consequence:** A future chat implementing Phase 1 has **no design freedom** over
what a "concept" or "known" means — both are fixed here by `wordKey` and
`classifyWord`.

### 2. Binding hard rules

These are canonical here. R1 inherits the bridge-deck contract; R2–R6 are new.

**R1 — One new concept per card (i+1).** A generated card introduces at most one
concept the learner does not already know. Any number of *known* concepts may
appear as context. *Inherits `bridge-deck-generation-contract.md` §5 Rule 1
("one new primary burden per card").*

**Why:** The condition under which a brain acquires is one new item wrapped in
comprehensible known material.

**R2 — ≤3 new concepts per lesson (ceiling; target 2).** The count of
not-yet-graduated surface forms introduced across all cards in one lesson must
not exceed 3. The generator targets 2 and may reach 3 only when both are trivial.

**Why:** This is the user's hard cap, stated at lesson granularity (the
bridge-deck contract constrains only cards). "Even if it takes 50 lessons to
learn a chorus" — the cap forces many small lessons rather than few dense ones.

**Consequence:** The existing tuning constants in `generateLesson.ts`
(`NEW_PER_STEP_MAX = 1`, `NEW_TARGET_COUNT_MAX = 2`) are the *seed* values;
Phase 1 promotes the per-card limit to a hard invariant across all stages and
adds the lesson-level ceiling of 3 as an enforced check.

**R3 — Concept = surface form; case/tense variants count separately.** A
grammatical-case or tense variant is a different surface form, therefore a
different concept, and counts separately against R1/R2. Inflected forms are
**not** folded into their lemma for counting.

**Why:** `фантомом` (instrumental) is a genuinely new recognition/production
burden on top of `фантом` (nominative). Folding them would silently let a lesson
teach "the same word in four cases" and call it one concept — exactly the dense
load R2 exists to prevent.

**Consequence:** The counter keys by `wordKey` (surface form), never by lemma.

**R4 — Dynamic sizing.** Pack size is a function of the learner's current
mastery: the more of a target's required context the learner does **not** yet
know, the larger the pack (the generator must teach that scaffolding first,
spreading it across lessons at ≤3 new/lesson); as mastery grows, the same target
needs fewer taught-context cards, so the pack shrinks. Detail in §3.

**R5 — No pre-made lesson packs except starter CLCC/basic-word seed packs.** All
music learning and all downstream learning is dynamically generated. The starter
CLCC/basic-word packs are the seed corpus (the atoms); everything built on top of
them is generated.

**Why:** A pre-built pack cannot satisfy R4 — it is sized for an average learner,
not the one in front of the app. Only the atomic seed (which has no
prerequisites) is exempt.

**Consequence:** Phase 4 retires the static song packs
(`svetoforFullDeck.ts` dense lessons; ultimately `buildArcLessons`/`INTRO_LESSONS`
too). The starter CLCC/basic decks remain as authored seed.

**R6 — CLCC + basic words are the majority scaffolding spine.** When the
generator wraps a target in context, the context is drawn preferentially from
the CLCC + basic-word pool, not from other lyric words. Lyric words are the
**targets** (the minority); CLCC/basic words are the **wrapping** (the majority).

**Why:** CLCC/basic words are high-frequency and reusable across every song; lyric
words are often song-unique slang. Using CLCC/basic as the spine maximizes
transfer — a scaffolded word learned in one song is known in the next.

### 3. Dynamic sizing (R4 in detail)

**Decision:** The arc for a target *T* is sized by the count of T's
required-context surface forms the learner has **not** graduated. Concretely:

1. The generator scores every candidate context phrase for *T* with the existing
   `phraseReadiness` (`utils/knowalong/mastery.ts` → `unknownCount`,
   `knownRatio`), reusing the introduce-stage sort from `generateLesson.ts`
   (fewest unknowns first).
2. If a phrase exists whose only unknown is *T* itself (`unknownCount === 1`),
   the arc is **minimal**: *T* wrapped in already-known context — one or two
   lessons. (This is the "learner did the preliminaries" case → small pack.)
3. If no such phrase exists, the generator **teaches the missing scaffolding
   first**: it picks the smallest set of not-yet-graduated CLCC/basic forms
   needed to make a context phrase comprehensible, introduces each as its own
   new concept (≤3/lesson, ≤1/card), then wraps *T*. More missing scaffolding →
   more lessons → larger pack. (This is the "learner jumped straight to music"
   case → large pack, per directive 2.)
4. The culminating full-line lesson (§5) is appended once *T* and its siblings
   in the line are all graduated.

**Why:** This makes R4 a direct function of mastery, computed from the same
`phraseReadiness` scores the Study path already uses — no new scoring model.

**Consequence:** Two learners generating the same target on the same day get
**different-sized** packs. That is the intended behavior, not a bug.

### 4. Spine seam — mock now, Supabase/Studio later

**Decision:** The generator depends on a `SpineProvider`, not on fixture files
directly. The seam is the contract the generator needs from the scaffolding
pool, per target language:

- a concept → `{ form, gloss, role }` lookup;
- candidate **known-context phrases** for a given target (combinatorial CLCC +
  basic-word phrases suitable to wrap a target i+1);
- the lyric targets themselves, in narrative order (from `svetoforSong.ts`).

Two implementations:

- **Mock spine (v1, today):** backed by the local fixtures
  `utils/knowalong/fixtures/clccSeed.ts` + `basicWords.ts` + `learningItems.ts`
  (+ `svetoforSong.ts` for targets). This is the only implementation in v1.
- **Supabase/Studio spine (future, Phase 6):** backed by Studio-published
  `concept_realizations` / published language-pack versions, read via the
  learner-Supabase path.

**Why:** Directive 6 — the fixtures are a stand-in for downstream data. If the
generator imports `clccSeed.ts` directly, swapping to Supabase later is a
scattergun edit across the generator. Behind a seam it is one implementation
swap.

**Consequence / v1 non-goal:** The consumer app performs **no learner-Supabase
CLCC read** in the song path today. Phase 6 is approval-gated on (a)
knowalong-studio publish activation (`STUDIO_LEARNER_SUPABASE_URL` +
`STUDIO_LEARNER_SUPABASE_SERVICE_KEY`, per Studio Invariant 3) and (b) a
learner-side Supabase read path — neither exists in v1. The mock spine remains
the fallback after Phase 6 lands.

### 5. Sequencing & gating

**Decision:**

- **Culminating-line lessons are mastery-gated.** A full-line lesson is locked
  until every surface form in the line is graduated. This is the one true hard
  gate, and it is natural: the line is the reward, and it must arrive 100%
  comprehensible.
- **Arc / target lessons are dynamically sized, not hard-blocked.** An
  under-prepared learner is **not** locked out of a song — per R4 they get a
  larger pack that teaches the missing scaffolding first. This supersedes the
  earlier "mastery-gated arc unlocking" idea: gating is realized as **dynamic
  sizing**, not as a wall.
- The existing sequential `isLessonUnlocked` (`utils/knowalong/progress.ts`)
  stays as the base ordering within a section (arcs precede their culminating
  line in narrative order); mastery-gating is an **additional** requirement on
  culminating-line lessons only.

**Why:** Locking a learner out of the feature they came for (music) because they
skipped preliminaries is hostile and contradicts directive 2. Letting them in
with a bigger pack honours both "no pre-made packs" and "dynamic sizing."

**Consequence:** `progress.ts` gains a mastery-aware unlock predicate for
culminating-line lessons in Phase 5; the sequential predicate is unchanged for
everything else.

### 6. Reuse map (no new engine)

The generator composes these **unchanged** primitives:

| Primitive | Location | Role in generation |
|---|---|---|
| `wordKey`, `classifyWord`, `shouldShowGloss`, `phraseReadiness`, `WORD_FADE_THRESHOLD` | `utils/knowalong/mastery.ts` | concept identity + knownness + phrase scoring |
| `wordMasteryStore` (`mastery: MasteryMap`, persisted `knowalong-word-mastery-v1`) | `stores/wordMasteryStore.ts` | the learner state generation reads |
| `lessonProgressStore` (`completedLessonIds`) | `stores/lessonProgressStore.ts` | sequential unlock + completion |
| Four-stage pipeline + `pickMode` + `buildCorpus` + seed constants | `utils/knowalong/generateLesson.ts` | the precedent; arc generation reuses its selection logic |
| `buildChipsForStep`, `getWordPool` | `utils/knowalong/fixtures/chips.ts` | chip bank per step (build/reverse/cloze) |
| `LessonRound` props contract | `components/knowalong/LessonRound.tsx` | the runtime a generated step must satisfy |
| `isLessonUnlocked`, `sectionProgress` | `utils/knowalong/progress.ts` | sequencing |
| Spine fixtures | `utils/knowalong/fixtures/{clccSeed,basicWords,learningItems}.ts` | mock `SpineProvider` data |
| Lyric targets + `tokenKey` mosaic | `utils/knowalong/fixtures/svetoforSong.ts`, `app/deck/[deckId]/section/[subDeckId].tsx` | target source + teaser UI |

**Why:** Music becomes dynamic the way Study already is. The delta is a
target-driven arc generator + a spine seam + an enforced cap — not a new engine.

### 7. Phased implementation roadmap

Each phase is a chat-sized, independently shippable checkpoint. **Only Phase 0
lands in this chat.**

| Phase | Scope | Exit criterion |
|---|---|---|
| **0** (this chat) | This ADR + `CLAUDE.md` canonical-docs pointer row. | Doc lands; cross-links resolve; no contradiction with `bridge-deck-generation-contract.md` or `CLAUDE.md` invariants. |
| **1** | Concept-cap foundation: `utils/knowalong/concept.ts` — `countNewConcepts(steps, mastery)` + `assertLessonWithinCap(lesson, mastery)` enforcing R1/R2/R3, keyed on `wordKey`. Pure, unit-tested. | Tests pin ≤1 new/card, ≤3 new/lesson, and that `фантом` + `фантомом` count as two. Hard rule becomes executable. |
| **2** | `SpineProvider` interface + mock impl wrapping the fixtures. Generator (and `generateLesson.ts` corpus) routes through the seam instead of importing fixtures directly. | Existing corpus reachable through the seam; all current behavior + tests unchanged. |
| **3** | Dynamic arc generator `buildArcForTarget(target, mastery, spine)` → sized `Lesson[]`, reusing the `generateLesson.ts` selection logic + R4 sizing + the Phase 1 cap. Pure, unit-tested. | Same target with full scaffolding-known yields a small arc; with empty mastery yields a larger teaching arc; **both** pass `assertLessonWithinCap`. |
| **3.1** | Compositional mode-B scaffolding + mode-A retry. Mode B teaches the gradient's own compositional **phrases** in corpus order (not decomposed single words): the hub `я` in its own lesson, then `я вижу` / `я знаю` / `я хочу` reusing it. Cap-safe because a compositional card shares a lesson only when its hub is already graduated (the cap measures against a frozen per-lesson mastery snapshot). A mode-A retry after each scaffolding word stops scaffolding the moment a prerequisite contextualizes a corpus target (teach `я`, reveal `вижу` as `я вижу`). Novel targets still fall back to a single-word card — morphological wrapping stays deferred to Phase 6. | Empty-mastery arc contains multi-word compositional cards (not bare isolated words); a corpus target with an unknown prerequisite is revealed in a contextual phrase; every lesson still passes the cap against its own lesson-start mastery. R4 sizing unchanged (empty → 3 lessons, full → 1). |
| **4** ✅ | Retire static song packs: the section screen generates lessons on the fly from `svetoforSong.ts` targets (narrative order) + the generator. Dense `V1/CH/V2/O` lessons removed; `buildArcLessons`/`INTRO_LESSONS` superseded by the dynamic path. **Landed (`08f44cb`):** new `utils/knowalong/songDeck.ts` — `buildSongSectionLessons` (arcs per target + a **shared section scaffolding budget** so the first target that needs prerequisites consumes it, with cross-target mastery evolution so scaffolding is reused, not re-taught in parallel) + `resolveDynamicSongLesson` (pure regenerate-and-find for `sdyn-` ids; the player routes those here and falls back to `getLesson` for static decks). Spine `lyricSteps` re-derived from `SVETOFOR_SONG` lines. `songCurriculum.ts` deleted; `svetoforFullDeck.ts` 370 lines lighter (sub-decks ship `lessons: []`). | Svetofor sections render dynamic, cap-compliant lessons; Study + CLCC decks unaffected; full audit + `tsc` + `build:web` green (all met). |
| **4.1** ✅ | No single-word lessons: a novel lyric target is wrapped in a real multi-word context phrase. **Landed (`33e530c`):** new `utils/knowalong/contextProvider.ts` — the `ContextProvider` seam (the sustainable conduit for AI associative context-mapping: mock derives ≤3-word lyric-line windows + morphology-safe particle clauses; a future Supabase impl serves AI-mapped phrases, mirroring `SpineProvider`). `arcGenerator` Mode B = context wrapping: reveal the target in a READY phrase, scaffolding a phrase's unknown words **only** when they are spine (gradient/CLCC) atoms — never a novel line-mate (which would be a single-word "victim"). Compositional arc is now the fallback. | The worked section (Intro) emits **zero** single-card single-word lessons (полетев → «будто полетев»); every Intro target surfaces in a multi-word phrase. |
| **5** ✅ | Mastery-gated culminating lines + lyric-teaser UI (the existing mosaic becomes the read-only teaser; the culminating-line lesson locks until all constituent surface forms are graduated). **Landed (`2f60709`):** new `utils/knowalong/culminatingLines.ts` (pure) — `buildCulminatingLines` (per-line lock state + lesson when unlocked), `isLineUnlocked` (all words graduated), `buildCulminatingLineLesson` (1-card full-line lesson; `surfaceForm` = analyzed words joined so it matches the chips, real `line.text` as the post-solve context sentence), + resolve/next helpers. Section screen gains a "Culminating lines" group (mastery-gated); the player resolves `sdyn-` ids via arcs then culminating lines. **Strict gate** (confirmed): a line with deferred words stays locked until the AI `ContextProvider` (Phase 6) graduates them. | A fresh learner cannot open a culminating line; a learner with all line-forms graduated can (met). |
| **6** (future, gated) | Supabase/Studio `SpineProvider` — reads published `concept_realizations`. Gated on Studio publish activation + a learner-Supabase read path (both approval-gated, not in v1). | Generator reads the spine from Supabase, mock spine remains fallback. |

### 8. Relationship to existing ADRs

- **`bridge-deck-generation-contract.md`** — future server-side target. §5 Rule 1
  ("one new primary burden per card") is R1 at card level; this ADR adds the
  lesson-level cap (R2) and dynamic sizing (R4). When the Studio/Supabase spine
  lands (Phase 6), generated consumer lessons should carry the contract's
  per-card metadata; until then the consumer carries the spirit without the
  machinery.
- **`knowalong-lyrics-domain-architecture.md`** (M3 source-vs-generated) — the
  culminating full-line card is **source-derived** (`generated_content = false`,
  quoting the user's own pasted lyric); the arc/context cards are **generated
  practice** (`generated_content = true`, never quoting source). Generation does
  not relax M3.
- **`local-analysis-clcc.md`** — provenance of the spine: the CLCC realizations
  that will feed the Supabase `SpineProvider` originate in the local-companion
  CLCC pipeline and the Studio publish checkpoint.

### 9. Non-goals / open questions

- **CLCC/basic *pacing* going dynamic.** v1 keeps CLCC/basic as authored starter
  seed packs (R5 exemption). Whether their *ordering/pacing* also becomes
  mastery-driven is a future phase, not v1.
- **Full bridge-deck-contract metadata** (pack-version IDs, review states,
  provenance, `source_line_id` on every source card, difficulty-budget
  reconciliation) — deferred until Phase 6.
- **`tokenKey` vs `wordKey` display discrepancy.** The mosaic UI
  (`app/deck/[deckId]/section/[subDeckId].tsx`) lowercases + strips non-letters
  via `tokenKey` for display matching, while mastery keys by `wordKey` (exact
  surface form, case-sensitive). A sentence-capitalized lyric word may show as
  unknown in the mosaic while its lowercase form is graduated. Phase 5 resolves
  this as part of the teaser work; it does not block R1–R6.
- **Distractor pool for chips.** `buildChipsForStep` draws distractors from
  `getWordPool()` (all fixtures). Dynamic generation must keep the distractor
  pool sensible (same-role, not-yet-graduated-but-plausible); noted for Phase 3/4.

## Revision trail

| # | Date | Change |
|---|---|---|
| 1 | 2026-08-01 | Initial. Mastery-driven lesson generation recorded: concept model on `wordKey`/`classifyWord`; binding hard rules R1–R6 (≤3 new concepts/lesson, surface-form concepts with case/tense variants separate, dynamic sizing, no pre-made packs except starter seed, CLCC/basic majority spine); mock↔Supabase `SpineProvider` seam; mastery-gated culminating lines + dynamically-sized arcs; reuse map over `generateLesson.ts`/`mastery.ts`/`LessonRound`; phased roadmap (Phases 0–6, Phase 0 doc-only). Consumer-app realization path for `bridge-deck-generation-contract.md`. No code, no migration. |
| 2 | 2026-08-01 | Added Phase 3.1 to the roadmap (compositional mode-B scaffolding + mode-A retry). Rationale: the Phase 3 first cut decomposed the gradient into isolated single-word companion cards, discarding the compositional design and producing the rote style the redesign rejected. Phase 3.1 (commit `a982f6b`) teaches the gradient's compositional phrases in corpus order — cap-safe via the frozen per-lesson mastery snapshot — and adds a mode-A retry so a corpus target with an unknown prerequisite is revealed in context (teach `я`, then `я вижу`). Novel-target morphological wrapping remains deferred to Phase 6. R1–R6 unchanged; R4 sizing unchanged. |
| 3 | 2026-08-01 | Marked Phase 4 landed (commit `08f44cb`). Song sections generate lessons dynamically from current mastery via `buildSongSectionLessons`. Two implementation decisions worth recording: (1) a **section-shared scaffolding budget** — the original per-arc budget would have had each novel target drag in its own 6 fresh spine words (the CLCC pool is deep), bloating a section to ~4×3 redundant lessons; sharing one budget across targets collapses Intro to ~6 coherent lessons; (2) **dynamic lesson identity** — `sdyn-` ids resolved by regenerate-and-find, with orphaned-but-completed ids benign for the lock/progress (arcs shrink as mastery grows); finer-grained identity is post-Phase-6. Spine `lyricSteps` re-derived from `SVETOFOR_SONG` lines. `songCurriculum.ts` retired. Culminating full-line lesson remains Phase 5. R1–R6 unchanged. |
| 4 | 2026-08-01 | Added Phase 4.1 (commit `33e530c`): no single-word lessons. A novel target is wrapped in a real context phrase via a new `ContextProvider` seam — the sustainable conduit for AI associative context-mapping (mock = lyric-line windows + particle clauses; future Supabase = AI-mapped phrases). Reframes the deferral: "no cloud in row generation" is unaffected (this is consumer-side wrapping of already-generated rows); the AI mapping that fills richer context is a future **Studio workstream** (not consumer LLM). Two load-bearing decisions: (a) the mock context source is the song's OWN lyric lines (real, correct, permanent fallback) — not throwaway authored phrases; (b) context wrapping scaffolds a phrase's unknown words only when they are **spine atoms**, never a novel line-mate (avoiding single-word "victims"). Honest residual: verbs/adj/nouns whose only context is a novel line-mate still fall to the compositional fallback in non-Intro sections — the AI ContextProvider (Phase 6) eliminates them. R1–R6 unchanged; Phase 5 culminating lines left clean (windows ≤3 words). |
| 5 | 2026-08-02 | Phase 4.1+ (commit `8f93817`): teachability filter + defer — the durable, source-agnostic quality rules. (1) **Teachability filter**: a context phrase is used only if it has ≥1 content word; pure function-word phrases («будто бы») are rejected. (2) **Defer**: a target with no Mode-A host and no teachable+wrappable context emits nothing (acquired via the culminating line in Phase 5) — never a single-word or nonsense card. A post-condition guard also defers any arc that would still yield a single-card single-word lesson (a lone scaffold atom). Retired the Phase 3.1 compositional fallback (it ended in a single-word target) and its section scaffolding budget. Net result: **zero** single-card single-word lessons across every section/mastery state. Trade-off: denser sections under-teach (clustered words with no spine anchor defer; the Outro fully defers) — the honest mock ceiling the AI `ContextProvider` resolves. The matching server-side generation contract is recorded in `knowalong-studio/_reports/lyric-context-generation.md` §3a. R1–R6 unchanged. |
| 6 | 2026-08-02 | Marked Phase 5 landed (commit `2f60709`). Culminating full-line lessons, mastery-gated (strict — confirmed decision: a line unlocks only when every word is graduated; rejected the "teach-then-assemble" mop-up for v1). A culminating lesson is 0-new (all graduated) → cap-safe; its card surface is the analyzed `line.words` joined (matches the chips), with the real `line.text` as the post-solve context. The deferred-words gap (Phase 4.1+) means deferred lines stay locked until the AI `ContextProvider` (Phase 6). This closes the ADR's phased roadmap through Phase 5; Phase 6 (Supabase/Studio spine + AI context) remains approval-gated. R1–R6 unchanged. |
