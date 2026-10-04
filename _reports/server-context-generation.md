# Server-side lyric-context generation — the Phase 6 backend contract

> **Status:** design / reference only. The Edge Function below is **not deployed**
> (landing it is approval-gated: Supabase Edge Function + frontier-AI credentials +
> a learner-Supabase read path — see `knowalong/CLAUDE.md` approval gates). This file
> exists so the server-side **intention** survives across iterations even when the
> mock details are forgotten. The consumer mock (`utils/knowalong/fixtures/
> contextPhrases.ts` → `AUTHORED_CONTEXT_PHRASES`) is a faithful stand-in for this
> function's output; when this lands, the consumer swaps mock → fetch behind the
> `ContextProvider` seam (`utils/knowalong/contextProvider.ts`) with no generator
> changes.

## The contract (one sentence)

Given a **target** word + the learner's **graduated vocabulary** (the palette ∩ what
this learner knows), a Supabase Edge Function asks a frontier AI to compose **≥8
fluent, morphologically-correct i+1 phrases** that weave the target into that known
vocabulary, verifies them, and returns them. The consumer's arc generator turns those
≥8 phrases into one **≥8-card encoding-variability lesson** (ADR rule **R7**).

This is the server-side realization of the i+1 context wrapping the mock does by hand
today. The mock cannot compose (no morphology metadata in `WordPart = {form, gloss,
role}`); the AI carries Russian inflection — that is the model's job, not the data's.

## Why a palette (the bedrock)

The system's versatility lives in a large, diverse **high-frequency vocabulary palette**
per language (`utils/knowalong/fixtures/palette.ts`). It does **double duty**:

1. It is what the **Core Vocabulary deck teaches** — so a learner graduates a known
   pool before reaching the songs.
2. It is what the **AI composes with** — every non-target word in a generated phrase is
   drawn from `palette ∩ graduated`, so the phrase is genuinely i+1 (only the target is
   new) and the consumer needs no scaffolding.

The palette is **seed data** (ADR R5's exempt starter pack), per-language, reusable
across every song, and passed to the Edge Function as an input parameter — so consumer
and server agree on the known pool. Expanding it is the highest-leverage non-throwaway
work here.

**Keying (ADR R3):** mastery keys by surface form. The mock palette ships the **surface
forms used** (mostly nominative nouns + conjugated verbs + masc-nom adjectives). The
**server** palette is **lemma-based** and the AI inflects — record both representations;
do not assume the mock's forms are lemmas.

## The Edge Function (reference implementation)

Deno / TypeScript (Supabase Edge Functions). On-demand, mastery-aware (per-learner i+1).
Inputs are supplied by the consumer; nothing is re-derived at the edge.

```ts
// supabase/functions/generate-lyric-context/index.ts  — REFERENCE, NOT DEPLOYED.
// Approval-gated. Mirrors the mock AUTHORED_CONTEXT_PHRASES output shape exactly so
// the consumer can swap mock → fetch with no generator changes.

import { serve } from "https://deno.land/std/http/server.ts";
import { createOpenAICompatibleAdapter } from "../../../knowalong-studio/lib/adapters/openaiCompat.ts"; // hypothetical server-side adapter

// ── Types (must match utils/knowalong/contextProvider.ts ContextPhrase) ──────────
interface WordPart { form: string; gloss: string; role: "pronoun" | "verb" | "noun" | "particle" | "adjective" | "adverb"; }
interface ContextPhrase { surfaceForm: string; meaning: string; words: WordPart[]; }

interface GenerateRequest {
  languageCode: string;            // e.g. "ru"
  target: WordPart;                // the lyric word to contextualize
  graduatedForms: string[];        // THIS learner's known surface forms (palette ∩ mastery)
  palette: WordPart[];             // the per-language palette (AI composition vocabulary)
  n: number;                       // R7 floor — call with 8
  model?: string;                  // frontier model name ("glm:…", "kimi:…", "deepseek:…")
}

const CONTENT_ROLES = new Set(["verb", "noun", "adjective", "adverb"]);
const hasSemanticAnchor = (p: ContextPhrase) =>
  p.words.some((w) => CONTENT_ROLES.has(w.role) || w.role === "pronoun");

// ── Verify gate (the construction invariants — same ones the mock respects) ──────
function verifyPhrase(p: ContextPhrase, target: WordPart, known: Set<string>): string | null {
  if (p.words.length < 2) return "phrase must be ≥2 words (cannot wrap the target)";
  if (!p.words.some((w) => w.form === target.form)) return "target must appear in the phrase";
  if (p.surfaceForm !== p.words.map((w) => w.form).join(" ")) return "surfaceForm must equal words joined";
  if (!hasSemanticAnchor(p)) return "phrase needs a content word or pronoun (no pure-particle)";
  // i+1: every NON-target word must be in the learner's known pool (palette ∩ graduated).
  for (const w of p.words) {
    if (w.form === target.form) continue;
    if (!known.has(w.form)) return `non-target word "${w.form}" is not known to this learner (not i+1)`;
  }
  return null;
}

// ── Native-speaker morphology verify (second model — the defense layer) ─────────
async function nativeMorphologyCheck(p: ContextPhrase, languageCode: string): Promise<boolean> {
  // Mirrors knowalong-studio lib/nativeProxy.ts: ask a second frontier model "Is this
  // {languageCode} sentence grammatical and natural? yes/no." Default to REJECT on
  // uncertainty. This is the layer the mock CANNOT do (wrong Russian teaches errors).
  return true; // TODO on activation — wire to the native-proxy adapter.
}

// ── Handler ─────────────────────────────────────────────────────────────────────
async function generate(req: GenerateRequest): Promise<ContextPhrase[]> {
  const known = new Set(req.graduatedForms);
  const paletteForms = req.palette.map((p) => `${p.form} (${p.gloss}, ${p.role})`).join(", ");
  const prompt = [
    `Compose ${req.n} short ${req.languageCode} phrases that include the word "${req.target.form}" (${req.target.gloss}, ${req.target.role}).`,
    `Weave it into vocabulary drawn ONLY from this known list: ${paletteForms}.`,
    `Rules: each phrase is fluent and morphologically correct; uses ONLY words from the known list plus the target "${req.target.form}"; has a content word or pronoun; is 2-5 words.`,
    `Return JSON: an array of { "surfaceForm": string, "meaning": string (natural English), "words": [{ "form": string, "gloss": string, "role": string }] }, where surfaceForm is exactly the words joined by single spaces.`,
  ].join(" ");

  const ai = createOpenAICompatibleAdapter(req.model ?? "glm:glm-4.6");
  const candidates: ContextPhrase[] = await ai.completeJSON<ContextPhrase[]>(prompt);

  const verified: ContextPhrase[] = [];
  for (const p of candidates) {
    const structural = verifyPhrase(p, req.target, known);
    if (structural) { console.warn(`reject (structural): ${structural}`, p); continue; }
    if (!(await nativeMorphologyCheck(p, req.languageCode))) { console.warn(`reject (morphology)`, p); continue; }
    verified.push(p);
    if (verified.length >= req.n) break;
  }

  // R7: the server MUST return ≥n. If the AI cannot, that is a prompt/data failure
  // (the consumer throws R7 on short authored sets) — re-prompt or mark the target
  // exempt with rationale, never silently return <n.
  if (verified.length < req.n) throw new Error(`R7: could not generate ≥${req.n} verified phrases for "${req.target.form}" (got ${verified.length})`);
  return verified;
}

serve(async (req) => {
  const body = (await req.json()) as GenerateRequest;
  // TODO on activation: auth (consumer service key), rate-limit, cost-log (purpose:
  // 'lyric-context' — surface on knowalong-studio /cloud-calls), cache by target+graduatedHash.
  const phrases = await generate(body);
  return Response.json({ phrases });
});
```

## Consumer wiring (on activation)

The `ContextProvider` seam (`utils/knowalong/contextProvider.ts`) is the swap point. A
Supabase-backed implementation fetches from this Edge Function and falls back to the
mock (`AUTHORED_CONTEXT_PHRASES` + lyric windows) when offline/unconfigured — mirroring
exactly the `SpineProvider` mock→Supabase pattern. `hasAuthoredContext` becomes always
true (every target is server-served) and R7 is then universally enforced.

## Open design forks (resolve on activation)

- **On-demand (above) vs pre-generated.** On-demand is per-learner i+1 (strongest) but
  costs an AI call per target per learner. Pre-generated (Studio authors once per target,
  publishes to `lyric_context_phrases`) is cheaper but not personalized — phrases use the
  full palette, so a cold learner scaffolds the palette words inline (the mock's current
  cold-start behavior). Decide based on cost/quality targets.
- **Caching key.** `{target, graduatedHash}` for on-demand; `{target, song}` for pre-gen.
- **Exempt targets.** A target the AI genuinely cannot contextualize (rare/archaic)
  returns an explicit `exempt: true, reason` so the consumer can skip it without throwing.

## What retires when this lands

- `AUTHORED_CONTEXT_PHRASES` (song-specific, hand-authored) — the mock stand-in.
- The mock's morphology ceiling (case-specific nouns like **фантомом**, **грома**, **дум**
  that defer today because the mock cannot place them in ≥8 correct phrases).
