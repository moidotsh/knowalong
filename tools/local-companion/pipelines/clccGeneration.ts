// tools/local-companion/pipelines/clccGeneration.ts
// 5-stage CLCC generation pipeline. Iterates Core Concepts from the request
// body. Realization proposals are persisted for review; CLCC promotion into
// concept_realizations is DEFERRED for this checkpoint.
//
// STAGE 2 (realizations) is rewritten for small-local-model reliability:
// - Concepts are processed in small BATCHES (default 6) so the model does
//   not lose attention over a 23-concept JSON emission.
// - Each batch response is validated against a STRICT per-entry Zod schema
//   (RealizationEntrySchema). Malformed entries are dropped with a warning.
// - On validation failure, the batch is retried ONCE with a remediation
//   reminder; if it still fails, surviving valid entries are kept and the
//   rest are dropped.
// - A summary of {generated, dropped, retried} is attached to the job result.

import { z } from 'zod';
import type { OllamaAdapter } from '../adapters/ollama';
import type { JobState } from '../jobManager';
import { jobManager } from '../jobManager';
import type {
  CompanionResultProposal,
  CompanionJobEvent,
  CompanionClccConceptInput,
} from '../../../shared/types/knowalong/companion';
import {
  CLCC_STAGES,
  stage1LanguageProfilePrompt,
  stage2RealizationsPrompt,
  stage3ExamplesPrompt,
  stage4ValidationPrompt,
  stage5SummaryPrompt,
  REALIZATION_TYPE_DB_VALUES,
  type ClccPromptInput,
} from '../prompts/clccGeneration';
import { logger } from '../../../utils/logger';

// ── Per-stage wrapper schemas (stages 1, 4, 5 stay loose; stage 3 is strict) ───
const ProfileSchema = z.object({ profile: z.object({}).passthrough() });
const ValidationSchema = z.object({
  missing: z.array(z.object({}).passthrough()),
  lowConfidence: z.array(z.object({}).passthrough()),
});
const SummarySchema = z.object({ summary: z.object({}).passthrough() });

// ── STRICT per-entry schema for stage 2 ────────────────────────────────
// Replaces the prior `z.object({}).passthrough()` which accepted literally
// anything. Small local models frequently emit malformed entries (null
// fields, surrogate codes, out-of-enum realizationType); the strict schema
// is the rejection gate.
//
// `transliteration` carries the romanized surface form (ISO 9 for Russian,
// ALA-LC/BGN/PCGN for Persian, BGN/PCGN/ISO 9985 for Armenian). It is
// OPTIONAL in the schema so models can omit it for Latin-script languages
// (French, Swedish — romanization is trivially the surface form itself)
// and so older callers stay backwards-compatible. For Russian it is the
// load-bearing Phase-1 addition: the editorial review-vote panel treats
// it as a first-class reviewable field, surfaced alongside surfaceForm
// wherever the Cyrillic form appears. Transliteration is DISTINCT from
// pronunciation guidance (IPA, stress marks, audio) — that is NOT in scope.
const RealizationEntrySchema = z
  .object({
    coreConceptCode: z.string().min(1).max(64),
    realizationType: z.enum(REALIZATION_TYPE_DB_VALUES),
    surfaceForm: z.string().min(1).max(500),
    gloss: z.string().min(1).max(500),
    grammaticalNote: z.string().min(1).max(2000),
    senseKind: z.enum(['core', 'contextual', 'idiomatic']),
    transliteration: z.string().min(1).max(500).optional(),
  })
  .strict();

/** Validated realization entry — exactly the shape Studio's draft mapper expects. */
export type ValidatedRealizationEntry = z.infer<typeof RealizationEntrySchema>;

/** Result of validating a single raw entry from the model output. */
type EntryValidation =
  | { ok: true; value: ValidatedRealizationEntry }
  | { ok: false; reason: string };

function validateEntry(
  raw: unknown,
  allowedCodes: ReadonlySet<string>,
): EntryValidation {
  const parsed = RealizationEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues[0]?.message ?? 'schema validation failed',
    };
  }
  if (!allowedCodes.has(parsed.data.coreConceptCode)) {
    return {
      ok: false,
      reason: `coreConceptCode not in request: ${parsed.data.coreConceptCode}`,
    };
  }
  return { ok: true, value: parsed.data };
}

/** ASCII-only surface form (letters/digits/apostrophes/hyphens, no diacritics,
 *  no Cyrillic/Arabic). Catches "likedat", "likedat'", "need-at" — the hybrid
 *  English-stem + Latin-suffix failure mode small local models emit for ru/fa.
 *  The apostrophe/hyphen allowance closes the gap where "likedat'" slipped past
 *  the prior `/^[A-Za-z][A-Za-z0-9]{3,}$/` regex (apostrophe broke the match). */
const ASCII_ONLY_PATTERN = /^[A-Za-z][A-Za-z0-9''\-]{3,}$/;

/** Heuristic surface-form sanity check. Catches the "likedat"/"needat" failure
 *  mode — including the apostrophe-bearing variant "likedat'" that previously
 *  slipped through. Real Russian/Persian surface forms contain Cyrillic /
 *  Arabic script; if a surfaceForm is entirely ASCII letters/digits/apostrophes
 *  and length >= 4, it is almost certainly hybrid junk for a ru/fa concept. */
function looksLikeHybridJunk(surfaceForm: string): boolean {
  return ASCII_ONLY_PATTERN.test(surfaceForm);
}

// ── Russian realization integrity checks ──────────────────────────────
//
// Post-generation hardening layer for ru realization entries. Runs AFTER
// RealizationEntrySchema (shape) and looksLikeHybridJunk (ASCII junk), and
// catches three classes of small-model hallucination that previously passed:
//
//   1. Latin-script surfaceForm (the model emitted a transliteration or an
//      invented English-stem form instead of the actual Cyrillic word).
//   2. Transliteration that does not match ISO 9 of the surfaceForm (the
//      model emitted "zhity" for "жить" where ISO 9 is "zhit'").
//   3. grammaticalNote self-contradictions ("verb, infinitive, present
//      tense, first person singular" or "adverb, prepositional case").
//
// Each helper returns `null` on success or a string rejection reason on
// failure. The Stage 2 finalize loop collects these and drops the entry
// with the reason visible in the operator log ("X accepted, Y dropped"
// carries the reason through to the awaiting_review summary).

const CYRILLIC_PATTERN = /[\u0400-\u04FF\u0500-\u052F]/;

/** ISO 9:1995 romanization (lowercase). Uses the ASCII-friendly variant the
 *  Stage 2 prompt instructs the model to follow (я→ya, ж→zh, ш→sh, щ→shch,
 *  ц→ts, ч→ch, ы→y, й→y, ю→yu, я→ya, ъ→'', ь→''). ё maps to "e" here; the
 *  plausibility check below treats ё cases with extra tolerance so the model
 *  emitting "yo" is still accepted. */
const ISO9_LOWER: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e',
  ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/** Build a per-character count of Latin letters expected from ISO 9 of the
 *  Cyrillic surfaceForm. Lowercase only; non-letters (apostrophes, hyphens,
 *  spaces) are dropped. */
function iso9Multiset(surfaceForm: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of surfaceForm.toLowerCase()) {
    const mapped = ISO9_LOWER[ch];
    if (mapped === undefined) continue; // non-Cyrillic char (apostrophe/space/etc.)
    for (const latin of mapped) {
      m.set(latin, (m.get(latin) ?? 0) + 1);
    }
  }
  return m;
}

/** Build a per-character count of Latin letters in the model's transliteration.
 *  Apostrophes, hyphens, spaces, and any non-[a-z] char are dropped (these are
 *  soft-sign markers or separators that the ISO 9 spec allows to vary). */
function latinMultiteral(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of s.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') {
      m.set(ch, (m.get(ch) ?? 0) + 1);
    }
  }
  return m;
}

/** Multiset symmetric-difference count. 0 means the multisets are equal. */
function multisetDiff(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  let diff = 0;
  for (const k of keys) {
    diff += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0));
  }
  return diff;
}

/** Reject Russian realization entries whose surfaceForm contains no Cyrillic.
 *  Catches the model emitting a transliteration/invention where a Cyrillic
 *  word was required. Returns the rejection reason or null if acceptable. */
export function rejectRussianSurfaceFormNoCyrillic(surfaceForm: string): string | null {
  if (!CYRILLIC_PATTERN.test(surfaceForm)) {
    return `surfaceForm "${surfaceForm}" contains no Cyrillic characters (real Russian realizations are Cyrillic).`;
  }
  return null;
}

/** Reject transliteration values that don't plausibly match ISO 9 of the
 *  surfaceForm. Tolerance is 0 by default; words containing ё get +3 per ё
 *  (covers the ё→"yo" expansion vs the canonical ё→"e" mapping). Returns
 *  the rejection reason or null if acceptable. */
export function rejectTransliterationMismatch(
  surfaceForm: string,
  transliteration: string,
): string | null {
  const expected = iso9Multiset(surfaceForm);
  if (expected.size === 0) return null; // surfaceForm has no Cyrillic; other check rejects
  const actual = latinMultiteral(transliteration);
  if (actual.size === 0) {
    return `transliteration "${transliteration}" contains no Latin letters.`;
  }
  const yoCount = (surfaceForm.toLowerCase().match(/ё/g) ?? []).length;
  const tolerance = yoCount * 3;
  const diff = multisetDiff(expected, actual);
  if (diff > tolerance) {
    return `transliteration "${transliteration}" does not match ISO 9 of surfaceForm "${surfaceForm}" (char-diff=${diff}, tolerance=${tolerance}).`;
  }
  return null;
}

// ── Grammar-note contradiction detection ──────────────────────────────
//
// These rules catch small-model nonsense like "verb, present tense, nominative
// singular" (verbs don't take case+number agreement unless participles) or
// "adverb, prepositional case" (adverbs don't inflect for case). Each rule is
// conservative — it only fires when the contradiction is internal to the
// grammaticalNote text itself, NOT on whether the note is the "right" note
// for the surfaceForm (that would require a Russian grammar dictionary).

const VERB_PERSON_NUMBER_TERMS = [
  'present tense', 'past tense', 'future tense',
  'first person', 'second person', 'third person',
  'singular', 'plural',
];
const CASE_TERMS = [
  'nominative', 'accusative', 'genitive', 'dative',
  'instrumental', 'prepositional', 'locative',
];
const VERB_TENSE_ASPECT_TERMS = [
  'present tense', 'past tense', 'future tense',
  'first person', 'second person', 'third person',
];

/** Detect internal grammaticalNote contradictions. Returns one reason string
 *  per contradiction found (typically 0 or 1). Empty array = no contradiction. */
export function detectGrammarNoteContradictions(grammaticalNote: string): string[] {
  const lower = grammaticalNote.toLowerCase();
  const has = (term: string) => lower.includes(term);
  const out: string[] = [];

  // Infinitives are not tensed, person-marked, number-marked, or case-marked.
  // Aspect ("imperfective aspect" / "perfective aspect") is FINE for infinitives.
  if (has('infinitive')) {
    for (const term of [...VERB_PERSON_NUMBER_TERMS, ...CASE_TERMS]) {
      if (has(term)) {
        out.push(
          `grammar-note contradiction: "infinitive" cannot co-occur with "${term}" (infinitives are not tensed/person/number/case-marked).`,
        );
        break;
      }
    }
  }

  // Adverbs do not inflect for case. (Exception: "adverbial" participles —
  // screened out by the adverbial check below.)
  if (has('adverb') && !has('adverbial')) {
    for (const c of CASE_TERMS) {
      if (has(c)) {
        out.push(
          `grammar-note contradiction: "adverb" cannot carry case "${c}" (adverbs are not inflected for case).`,
        );
        break;
      }
    }
  }

  // Verbs (other than participles / gerunds / adverbial forms) cannot carry
  // case + number agreement. Catches "verb, present tense, nominative singular".
  if (
    has('verb') &&
    !has('participle') &&
    !has('gerund') &&
    !has('adverbial')
  ) {
    const hasCase = CASE_TERMS.some(has);
    const hasNumber = has('singular') || has('plural');
    if (hasCase && hasNumber) {
      out.push(
        'grammar-note contradiction: a finite/infinitive verb cannot carry case + number agreement (only participles and gerunds can).',
      );
    }
  }

  // Nouns cannot carry verb tense / person. Catches "noun, present tense, first person singular".
  if (has('noun') && !has('pronoun') && !has('noun phrase')) {
    for (const t of VERB_TENSE_ASPECT_TERMS) {
      if (has(t)) {
        out.push(
          `grammar-note contradiction: "noun" cannot carry verbal property "${t}".`,
        );
        break;
      }
    }
  }

  // Russian prepositions do not govern nominative case (the only marginal
  // exception is poetic/inverted word order; flag for review in normal prose).
  if (has('preposition') && has('nominative')) {
    out.push(
      'grammar-note contradiction: Russian prepositions do not govern nominative case.',
    );
  }

  return out;
}

/** Full Russian realization integrity check. Returns an array of rejection
 *  reasons (empty = entry acceptable). Runs script + transliteration + grammar
 *  checks; each can produce one or more reasons. */
export function rejectRussianRealizationDefects(entry: {
  surfaceForm: string;
  transliteration?: string;
  grammaticalNote: string;
}): string[] {
  const reasons: string[] = [];
  const scriptReason = rejectRussianSurfaceFormNoCyrillic(entry.surfaceForm);
  if (scriptReason) reasons.push(scriptReason);
  if (entry.transliteration && entry.transliteration.trim().length > 0) {
    const trReason = rejectTransliterationMismatch(entry.surfaceForm, entry.transliteration);
    if (trReason) reasons.push(trReason);
  }
  reasons.push(...detectGrammarNoteContradictions(entry.grammaticalNote));
  return reasons;
}

// ── STRICT per-entry schema for stage 3 (example sentences) ────────────
// Mirrors Stage 2's discipline. Small local models emit invented words
// ("валяя", "деляю"), mixed-script sentences, transliterated Latin when the
// language has its own script, and translations that don't match the source.
// The strict schema + script-aware junk filter is the rejection gate.
//
// `transliteration` carries the romanized sourceText (same scheme as the
// realization: ISO 9 for Russian). Optional — see RealizationEntrySchema
// header for the rationale.
const ExampleEntrySchema = z
  .object({
    coreConceptCode: z.string().min(1).max(64),
    sourceText: z.string().min(2).max(500),
    translation: z.string().min(2).max(500),
    transliteration: z.string().min(2).max(500).optional(),
  })
  .strict();

/** Validated example-sentence entry — exactly the shape Studio's draft mapper expects. */
export type ValidatedExampleEntry = z.infer<typeof ExampleEntrySchema>;

/** Result of validating a single raw example entry from the model output. */
type ExampleEntryValidation =
  | { ok: true; value: ValidatedExampleEntry }
  | { ok: false; reason: string };

function validateExampleEntry(
  raw: unknown,
  allowedCodes: ReadonlySet<string>,
): ExampleEntryValidation {
  const parsed = ExampleEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues[0]?.message ?? 'schema validation failed',
    };
  }
  if (!allowedCodes.has(parsed.data.coreConceptCode)) {
    return {
      ok: false,
      reason: `coreConceptCode not in request: ${parsed.data.coreConceptCode}`,
    };
  }
  return { ok: true, value: parsed.data };
}

/**
 * Script-aware sanity check for example sentences. Catches the most common
 * small-model failure modes per target language:
 *   - Russian (ru): sourceText must contain at least one Cyrillic char.
 *     Invented stems like "валяя"/"деляю" pass this check (they're
 *     well-formed Cyrillic) but get caught by the review-vote stage; purely
 *     Latin or transliterated ru sentences are rejected here.
 *   - Persian (fa): sourceText must contain at least one Arabic-script char.
 *     Latin-only transliteration is rejected.
 *   - French (fr): sourceText must contain at least one Latin letter.
 *     Placeholder tokens ("TODO", "???", the concept code itself) are rejected.
 *
 * Single-letter scripts (e.g. "Я иду.") contain spaces and short words; the
 * check only requires AT LEAST ONE char of the expected script, not a ratio.
 */
function looksLikeExampleJunk(sourceText: string, targetLanguageCode: 'fr' | 'ru' | 'fa'): boolean {
  // Placeholder / surrogate token check applies to all languages.
  const trimmed = sourceText.trim();
  const PLACEHOLDER_TOKENS = new Set([
    'todo', 'none', 'null', 'n/a', '?', '???', '…', '—', '-', '...', 'placeholder',
  ]);
  if (PLACEHOLDER_TOKENS.has(trimmed.toLowerCase())) return true;
  if (trimmed.length < 2) return true;

  if (targetLanguageCode === 'ru') {
    // U+0400–U+04FF is the Cyrillic block. Also accept Cyrillic Supplement
    // (U+0500–U+052F) for minority languages just in case.
    return !/[\u0400-\u04FF\u0500-\u052F]/.test(sourceText);
  }
  if (targetLanguageCode === 'fa') {
    // Arabic block (U+0600–U+06FF) + Arabic Presentation Forms-A/B
    // (U+FB50–U FDFF, U+FE70–U+FEFF) cover Persian/Arabic script.
    return !/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(sourceText);
  }
  // fr — require at least one Latin letter.
  return !/[A-Za-zÀ-ÿ]/.test(sourceText);
}

// ── Pipeline entry point ──────────────────────────────────────────────

export interface ClccPipelineDeps {
  ollama: OllamaAdapter;
}

export interface ClccJobRequest {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  coreConcepts?: CompanionClccConceptInput[];
  existingRealizationSurfaceForms?: string[];
  modelLabel?: string;
}

/** Batch size for stage-2 generation. Small enough to keep a 3B model's attention. */
const STAGE2_BATCH_SIZE = 6;

/** Batch size for stage-3 example sentences. Sentences are longer than surface
 *  forms, so the batch is smaller than stage 2's to preserve model attention. */
const STAGE3_BATCH_SIZE = 5;

export async function runClccPipeline(
  job: JobState,
  request: ClccJobRequest,
  deps: ClccPipelineDeps,
): Promise<void> {
  const promptInput: ClccPromptInput = {
    targetLanguageCode: request.targetLanguageCode,
    coreConceptCodes: request.coreConceptCodes,
    coreConcepts: request.coreConcepts,
    existingRealizationSurfaceForms: request.existingRealizationSurfaceForms,
  };
  const model = request.modelLabel ?? deps.ollama.defaultModel;
  let nextOrdinal = 1;

  const emitModelOutput = (
    stageId: string,
    stageLabel: string,
    r: { text: string; model: string },
  ): void => {
    emitEvent(job, {
      kind: 'event',
      ordinal: nextOrdinal++,
      severity: 'progress',
      stage: stageLabel,
      message: `Model responded (${r.text.length} chars).`,
      payload: {
        modelOutput: r.text,
        model: r.model,
        stageId,
        chars: r.text.length,
      },
    });
  };

  // Accumulator for validated realization entries. Stage 2 fills this.
  const validatedEntries: ValidatedRealizationEntry[] = [];
  const droppedCodes: Array<{ code: string; reason: string }> = [];
  const acceptedCodes = new Set<string>();
  let batchRetries = 0;

  // Accumulator for validated example-sentence entries. Stage 3 fills this.
  const validatedExamples: ValidatedExampleEntry[] = [];
  const droppedExamples: Array<{ code: string; reason: string }> = [];
  const acceptedExampleCodes = new Set<string>();
  let exampleBatchRetries = 0;

  const stages: Array<{ id: string; label: string; run: () => Promise<void> }> = [
    {
      id: 'profile',
      label: CLCC_STAGES[0].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.2, ...stage1LanguageProfilePrompt(promptInput) });
        emitModelOutput('profile', CLCC_STAGES[0].label, r);
        ProfileSchema.parse(JSON.parse(r.text));
      },
    },
    {
      id: 'realizations',
      label: CLCC_STAGES[1].label,
      run: async () => {
        const batches = chunk(request.coreConceptCodes, STAGE2_BATCH_SIZE);
        const allowedCodes = new Set(request.coreConceptCodes);
        const metaByCode = new Map((request.coreConcepts ?? []).map((c) => [c.code, c]));

        for (let bi = 0; bi < batches.length; bi++) {
          const batch = batches[bi];
          const batchMeta = batch
            .map((code) => metaByCode.get(code))
            .filter((m): m is CompanionClccConceptInput => m !== undefined);
          const batchPromptInput: ClccPromptInput = {
            ...promptInput,
            coreConceptCodes: batch,
            coreConcepts: batchMeta.length === batch.length ? batchMeta : promptInput.coreConcepts,
          };

          const result = await generateAndValidateBatch(deps, model, batchPromptInput, batch, allowedCodes, {
            targetLanguageCode: request.targetLanguageCode,
          });
          for (const v of result.validated) {
            if (!acceptedCodes.has(v.coreConceptCode)) {
              acceptedCodes.add(v.coreConceptCode);
              validatedEntries.push(v);
            }
          }
          for (const d of result.dropped) {
            if (!acceptedCodes.has(d.code)) droppedCodes.push(d);
          }
          batchRetries += result.retriesUsed;

          emitEvent(job, {
            kind: 'event',
            ordinal: nextOrdinal++,
            severity: result.dropped.length > 0 ? 'warning' : 'progress',
            stage: CLCC_STAGES[1].label,
            message: `Batch ${bi + 1}/${batches.length}: ${result.validated.length} accepted, ${result.dropped.length} dropped${result.retriesUsed > 0 ? `, ${result.retriesUsed} retry` : ''}.`,
            payload: {
              batchIndex: bi,
              batchSize: batch.length,
              accepted: result.validated.map((v) => v.coreConceptCode),
              dropped: result.dropped,
              retriesUsed: result.retriesUsed,
              stageId: 'realizations',
              modelOutput: result.rawText,
              model: result.model,
              chars: result.rawText.length,
            },
          });
        }
      },
    },
    {
      id: 'examples',
      label: CLCC_STAGES[2].label,
      run: async () => {
        // Stage 3 processes only concepts that Stage 2 successfully realized.
        // Anchoring examples on actual surface forms prevents the model from
        // inventing words to illustrate concepts it has no realization for.
        const exampleCodes = validatedEntries.map((e) => e.coreConceptCode);
        if (exampleCodes.length === 0) {
          emitEvent(job, {
            kind: 'event',
            ordinal: nextOrdinal++,
            severity: 'warning',
            stage: CLCC_STAGES[2].label,
            message: 'Skipping example generation — no valid realizations to anchor on.',
            payload: { stageId: 'examples', reason: 'no_realizations' },
          });
          return;
        }
        const allowedExampleCodes = new Set(exampleCodes);
        const realizationsForPrompt = validatedEntries.map((e) => ({
          coreConceptCode: e.coreConceptCode,
          surfaceForm: e.surfaceForm,
        }));
        const batches = chunk(exampleCodes, STAGE3_BATCH_SIZE);
        const metaByCode = new Map((request.coreConcepts ?? []).map((c) => [c.code, c]));

        for (let bi = 0; bi < batches.length; bi++) {
          const batch = batches[bi];
          const batchMeta = batch
            .map((code) => metaByCode.get(code))
            .filter((m): m is CompanionClccConceptInput => m !== undefined);
          const batchRealizations = realizationsForPrompt.filter((r) => batch.includes(r.coreConceptCode));
          const batchPromptInput: ClccPromptInput = {
            ...promptInput,
            coreConceptCodes: batch,
            coreConcepts: batchMeta.length === batch.length ? batchMeta : promptInput.coreConcepts,
            realizations: batchRealizations,
          };

          const result = await generateAndValidateExampleBatch(
            deps,
            model,
            batchPromptInput,
            batch,
            allowedExampleCodes,
            request.targetLanguageCode,
          );
          for (const v of result.validated) {
            if (!acceptedExampleCodes.has(v.coreConceptCode)) {
              acceptedExampleCodes.add(v.coreConceptCode);
              validatedExamples.push(v);
            }
          }
          for (const d of result.dropped) {
            if (!acceptedExampleCodes.has(d.code)) droppedExamples.push(d);
          }
          exampleBatchRetries += result.retriesUsed;

          emitEvent(job, {
            kind: 'event',
            ordinal: nextOrdinal++,
            severity: result.dropped.length > 0 ? 'warning' : 'progress',
            stage: CLCC_STAGES[2].label,
            message: `Batch ${bi + 1}/${batches.length}: ${result.validated.length} accepted, ${result.dropped.length} dropped${result.retriesUsed > 0 ? `, ${result.retriesUsed} retry` : ''}.`,
            payload: {
              batchIndex: bi,
              batchSize: batch.length,
              accepted: result.validated.map((v) => v.coreConceptCode),
              dropped: result.dropped,
              retriesUsed: result.retriesUsed,
              stageId: 'examples',
              modelOutput: result.rawText,
              model: result.model,
              chars: result.rawText.length,
            },
          });
        }
      },
    },
    {
      id: 'validation',
      label: CLCC_STAGES[3].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.1, ...stage4ValidationPrompt(promptInput) });
        emitModelOutput('validation', CLCC_STAGES[3].label, r);
        ValidationSchema.parse(JSON.parse(r.text));
      },
    },
    {
      id: 'summary',
      label: CLCC_STAGES[4].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.1, ...stage5SummaryPrompt(promptInput) });
        emitModelOutput('summary', CLCC_STAGES[4].label, r);
        SummarySchema.parse(JSON.parse(r.text));
      },
    },
  ];

  jobManager.setStage(job.id, stages[0].label, 0, stages.length);
  jobManager.transition(job.id, 'connecting');
  jobManager.transition(job.id, 'running');

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    emitEvent(job, {
      kind: 'event',
      ordinal: nextOrdinal++,
      severity: 'stage_start',
      stage: stage.label,
      message: `Stage ${i + 1}/${stages.length}: ${stage.label}`,
      payload: { stageIndex: i, stageCount: stages.length },
    });
    jobManager.setStage(job.id, stage.label, i, stages.length);
    try {
      await stage.run();
      emitEvent(job, {
        kind: 'event',
        ordinal: nextOrdinal++,
        severity: 'stage_complete',
        stage: stage.label,
        message: `Stage ${i + 1}/${stages.length} complete.`,
        payload: { stageIndex: i, stageCount: stages.length },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.warn('companion', `CLCC stage ${stage.id} failed after retries`, { message });
      emitEvent(job, {
        kind: 'event',
        ordinal: nextOrdinal++,
        severity: 'warning',
        stage: stage.label,
        message: `Stage ${stage.label} failed after retries; continuing. Reason: ${message}`,
        payload: { stageIndex: i, error: message },
      });
    }
  }

  jobManager.transition(job.id, 'validating');

  // Build proposals from validated entries. Invalid/dropped entries do NOT
  // become proposals — better to have fewer clean entries than many junk ones.
  // Realization proposals come first; example proposals follow, anchored on
  // the realization surface form for reviewer context.
  const realizationByCode = new Map(validatedEntries.map((e) => [e.coreConceptCode, e.surfaceForm]));
  const realizationProposals: CompanionResultProposal[] = validatedEntries.map((entry, i) => ({
    proposalKind: 'realization',
    ordinal: i + 1,
    payload: {
      ...entry,
      languageCode: request.targetLanguageCode,
      lemmaProposalOrdinal: null,
    },
  }));
  const exampleProposals: CompanionResultProposal[] = validatedExamples.map((entry, i) => ({
    proposalKind: 'example',
    ordinal: i + 1,
    payload: {
      ...entry,
      languageCode: request.targetLanguageCode,
      realizationSurfaceForm: realizationByCode.get(entry.coreConceptCode) ?? null,
    },
  }));
  const proposals = [...realizationProposals, ...exampleProposals];

  const proposalCounts: Record<string, number> = {};
  for (const p of proposals) {
    proposalCounts[p.proposalKind] = (proposalCounts[p.proposalKind] ?? 0) + 1;
  }

  jobManager.complete(job.id, {
    proposalCounts,
    proposals,
    summary: {
      stageCount: stages.length,
      realizationCount: realizationProposals.length,
      exampleCount: exampleProposals.length,
      conceptCount: request.coreConceptCodes.length,
      requested: request.coreConceptCodes.length,
      accepted: realizationProposals.length,
      acceptedExamples: exampleProposals.length,
      dropped: droppedCodes.length,
      droppedExampleCount: droppedExamples.length,
      batchRetries,
      exampleBatchRetries,
      droppedCodes,
      droppedExamples,
    },
  });

  emitEvent(job, {
    kind: 'event',
    ordinal: nextOrdinal++,
    severity: 'stage_complete',
    stage: 'complete',
    message: `CLCC generation complete — review required. ${realizationProposals.length} of ${request.coreConceptCodes.length} concepts produced valid realizations${droppedCodes.length > 0 ? `; ${droppedCodes.length} dropped` : ''}. ${exampleProposals.length} example sentences${droppedExamples.length > 0 ? `; ${droppedExamples.length} dropped` : ''}.`,
    payload: {
      status: 'awaiting_review',
      realizationCount: realizationProposals.length,
      exampleCount: exampleProposals.length,
      requested: request.coreConceptCodes.length,
      dropped: droppedCodes.length,
      droppedExamples: droppedExamples.length,
      batchRetries,
      exampleBatchRetries,
    },
  });
}

// ── Stage-2 batch helpers ─────────────────────────────────────────────

interface BatchResult {
  validated: ValidatedRealizationEntry[];
  dropped: Array<{ code: string; reason: string }>;
  retriesUsed: number;
  rawText: string;
  model: string;
}

/** Target language code is threaded through finalizeBatch so the Russian
 *  realization integrity check (script + transliteration + grammar) only fires
 *  for ru. Other languages (fr/fa) skip it for now — the prompt instructs the
 *  model on the appropriate script for each, and the existing Stage 3 example
 *  junk filter handles fa/fr script checks at the example level. */
interface BatchLanguageContext {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
}

async function generateAndValidateBatch(
  deps: ClccPipelineDeps,
  model: string,
  batchPromptInput: ClccPromptInput,
  batchCodes: string[],
  allowedCodes: ReadonlySet<string>,
  ctx: BatchLanguageContext,
): Promise<BatchResult> {
  // First attempt.
  const r1 = await deps.ollama.generate({
    model,
    temperature: 0.3,
    ...stage2RealizationsPrompt(batchPromptInput),
  });
  const parsed1 = tryParseRealizations(r1.text);
  if (parsed1.kind === 'parse-fail') {
    // JSON parse failed entirely — retry once with a stricter reminder.
    const r2 = await deps.ollama.generate({
      model,
      temperature: 0.2,
      ...stage2RealizationsPrompt(batchPromptInput),
    });
    const parsed2 = tryParseRealizations(r2.text);
    if (parsed2.kind === 'parse-fail') {
      // Both attempts unparseable. Drop the whole batch with a clear reason.
      return {
        validated: [],
        dropped: batchCodes.map((code) => ({ code, reason: 'model output was not valid JSON after retry' })),
        retriesUsed: 1,
        rawText: r2.text,
        model: r2.model,
      };
    }
    return finalizeBatch(parsed2.entries, batchCodes, allowedCodes, r2, ctx);
  }
  const firstPass = finalizeBatch(parsed1.entries, batchCodes, allowedCodes, r1, ctx);
  // If the first pass accepted everything, we're done. Otherwise retry once
  // for the missing codes.
  const missingFromFirst = batchCodes.filter((c) => !firstPass.validated.some((v) => v.coreConceptCode === c));
  if (missingFromFirst.length === 0) {
    return firstPass;
  }
  // Retry for just the missing codes.
  const metaByCode = new Map((batchPromptInput.coreConcepts ?? []).map((c) => [c.code, c]));
  const retryPromptInput: ClccPromptInput = {
    ...batchPromptInput,
    coreConceptCodes: missingFromFirst,
    coreConcepts: missingFromFirst
      .map((c) => metaByCode.get(c))
      .filter((m): m is CompanionClccConceptInput => m !== undefined),
  };
  const r2 = await deps.ollama.generate({
    model,
    temperature: 0.2,
    ...stage2RealizationsPrompt(retryPromptInput),
  });
  const parsed2 = tryParseRealizations(r2.text);
  if (parsed2.kind === 'parse-fail') {
    return firstPass; // keep first-pass results; don't retry again.
  }
  const secondPass = finalizeBatch(parsed2.entries, missingFromFirst, allowedCodes, r2, ctx);
  return {
    validated: [...firstPass.validated, ...secondPass.validated],
    dropped: [...firstPass.dropped, ...secondPass.dropped],
    retriesUsed: 1,
    rawText: r2.text,
    model: r2.model,
  };
}

function finalizeBatch(
  entries: unknown[],
  batchCodes: string[],
  allowedCodes: ReadonlySet<string>,
  response: { text: string; model: string },
  ctx: BatchLanguageContext,
): BatchResult {
  const validated: ValidatedRealizationEntry[] = [];
  const dropped: Array<{ code: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const raw of entries) {
    const v = validateEntry(raw, allowedCodes);
    if (!v.ok) {
      // Try to attribute the failure to a code if possible.
      const codeHint = extractCode(raw);
      dropped.push({
        code: codeHint ?? `(batch entry)`,
        reason: v.reason,
      });
      continue;
    }
    if (seen.has(v.value.coreConceptCode)) continue; // dedupe within batch
    if (looksLikeHybridJunk(v.value.surfaceForm)) {
      dropped.push({
        code: v.value.coreConceptCode,
        reason: `surfaceForm "${v.value.surfaceForm}" looks like hybrid junk (ASCII-only)`,
      });
      continue;
    }
    // Russian-specific integrity check: script + transliteration + grammar.
    // Failures here drop the row with a specific reason visible to the operator.
    if (ctx.targetLanguageCode === 'ru') {
      const defects = rejectRussianRealizationDefects({
        surfaceForm: v.value.surfaceForm,
        transliteration: v.value.transliteration,
        grammaticalNote: v.value.grammaticalNote,
      });
      if (defects.length > 0) {
        dropped.push({
          code: v.value.coreConceptCode,
          reason: defects.join(' '),
        });
        continue;
      }
    }
    seen.add(v.value.coreConceptCode);
    validated.push(v.value);
  }

  // Any code in the batch that didn't produce a valid entry is dropped.
  for (const code of batchCodes) {
    if (!seen.has(code)) {
      if (!dropped.some((d) => d.code === code)) {
        dropped.push({ code, reason: 'no valid entry emitted by the model' });
      }
    }
  }

  return {
    validated,
    dropped,
    retriesUsed: 0,
    rawText: response.text,
    model: response.model,
  };
}

function tryParseRealizations(
  text: string,
): { kind: 'ok'; entries: unknown[] } | { kind: 'parse-fail'; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { kind: 'parse-fail', reason: e instanceof Error ? e.message : 'JSON.parse failed' };
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Record<string, unknown>).realizations)) {
    return { kind: 'parse-fail', reason: 'missing realizations[]' };
  }
  return { kind: 'ok', entries: (parsed as { realizations: unknown[] }).realizations };
}

function extractCode(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const v = raw as Record<string, unknown>;
  return typeof v.coreConceptCode === 'string' ? v.coreConceptCode : undefined;
}

// ── Stage-3 batch helpers ─────────────────────────────────────────────
// Mirror Stage 2's two-attempt retry + finalize pattern. Stage 3 needs the
// targetLanguageCode to drive the script-aware junk filter, so it's threaded
// through the helper.

interface ExampleBatchResult {
  validated: ValidatedExampleEntry[];
  dropped: Array<{ code: string; reason: string }>;
  retriesUsed: number;
  rawText: string;
  model: string;
}

async function generateAndValidateExampleBatch(
  deps: ClccPipelineDeps,
  model: string,
  batchPromptInput: ClccPromptInput,
  batchCodes: string[],
  allowedCodes: ReadonlySet<string>,
  targetLanguageCode: 'fr' | 'ru' | 'fa',
): Promise<ExampleBatchResult> {
  const r1 = await deps.ollama.generate({
    model,
    temperature: 0.4,
    ...stage3ExamplesPrompt(batchPromptInput),
  });
  const parsed1 = tryParseExamples(r1.text);
  if (parsed1.kind === 'parse-fail') {
    const r2 = await deps.ollama.generate({
      model,
      temperature: 0.3,
      ...stage3ExamplesPrompt(batchPromptInput),
    });
    const parsed2 = tryParseExamples(r2.text);
    if (parsed2.kind === 'parse-fail') {
      return {
        validated: [],
        dropped: batchCodes.map((code) => ({ code, reason: 'model output was not valid JSON after retry' })),
        retriesUsed: 1,
        rawText: r2.text,
        model: r2.model,
      };
    }
    return finalizeExampleBatch(parsed2.entries, batchCodes, allowedCodes, targetLanguageCode, r2);
  }
  const firstPass = finalizeExampleBatch(parsed1.entries, batchCodes, allowedCodes, targetLanguageCode, r1);
  const missingFromFirst = batchCodes.filter((c) => !firstPass.validated.some((v) => v.coreConceptCode === c));
  if (missingFromFirst.length === 0) {
    return firstPass;
  }
  // Retry for just the missing codes, anchored on their realizations.
  const metaByCode = new Map((batchPromptInput.coreConcepts ?? []).map((c) => [c.code, c]));
  const realizationsByCode = new Map((batchPromptInput.realizations ?? []).map((r) => [r.coreConceptCode, r.surfaceForm]));
  const retryPromptInput: ClccPromptInput = {
    ...batchPromptInput,
    coreConceptCodes: missingFromFirst,
    coreConcepts: missingFromFirst
      .map((c) => metaByCode.get(c))
      .filter((m): m is CompanionClccConceptInput => m !== undefined),
    realizations: missingFromFirst
      .filter((c) => realizationsByCode.has(c))
      .map((c) => ({ coreConceptCode: c, surfaceForm: realizationsByCode.get(c)! })),
  };
  const r2 = await deps.ollama.generate({
    model,
    temperature: 0.3,
    ...stage3ExamplesPrompt(retryPromptInput),
  });
  const parsed2 = tryParseExamples(r2.text);
  if (parsed2.kind === 'parse-fail') {
    return firstPass;
  }
  const secondPass = finalizeExampleBatch(parsed2.entries, missingFromFirst, allowedCodes, targetLanguageCode, r2);
  return {
    validated: [...firstPass.validated, ...secondPass.validated],
    dropped: [...firstPass.dropped, ...secondPass.dropped],
    retriesUsed: 1,
    rawText: r2.text,
    model: r2.model,
  };
}

function finalizeExampleBatch(
  entries: unknown[],
  batchCodes: string[],
  allowedCodes: ReadonlySet<string>,
  targetLanguageCode: 'fr' | 'ru' | 'fa',
  response: { text: string; model: string },
): ExampleBatchResult {
  const validated: ValidatedExampleEntry[] = [];
  const dropped: Array<{ code: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const raw of entries) {
    const v = validateExampleEntry(raw, allowedCodes);
    if (!v.ok) {
      const codeHint = extractCode(raw);
      dropped.push({
        code: codeHint ?? `(batch entry)`,
        reason: v.reason,
      });
      continue;
    }
    if (seen.has(v.value.coreConceptCode)) continue;
    if (looksLikeExampleJunk(v.value.sourceText, targetLanguageCode)) {
      dropped.push({
        code: v.value.coreConceptCode,
        reason: `sourceText "${v.value.sourceText}" failed script-aware junk filter for ${targetLanguageCode}`,
      });
      continue;
    }
    seen.add(v.value.coreConceptCode);
    validated.push(v.value);
  }

  for (const code of batchCodes) {
    if (!seen.has(code)) {
      if (!dropped.some((d) => d.code === code)) {
        dropped.push({ code, reason: 'no valid example emitted by the model' });
      }
    }
  }

  return {
    validated,
    dropped,
    retriesUsed: 0,
    rawText: response.text,
    model: response.model,
  };
}

function tryParseExamples(
  text: string,
): { kind: 'ok'; entries: unknown[] } | { kind: 'parse-fail'; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { kind: 'parse-fail', reason: e instanceof Error ? e.message : 'JSON.parse failed' };
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Record<string, unknown>).examples)) {
    return { kind: 'parse-fail', reason: 'missing examples[]' };
  }
  return { kind: 'ok', entries: (parsed as { examples: unknown[] }).examples };
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  // s10-exempt: internal precondition guard; callers pass the literal STAGE2_BATCH_SIZE.
  if (size < 1) throw new Error('chunk size must be >= 1');
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function emitEvent(job: JobState, event: CompanionJobEvent): void {
  jobManager.appendEvent(job.id, event);
}
