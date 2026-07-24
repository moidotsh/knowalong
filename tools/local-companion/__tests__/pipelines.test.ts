// tools/local-companion/__tests__/pipelines.test.ts
// Pipeline tests: stage order, retry behavior, warning-on-fail, and the
// new stage-2 strict-validation + batching behavior.

import { describe, it, expect, beforeEach } from 'bun:test';
import { jobManager } from '../jobManager';
import { runSourceAnalysisPipeline } from '../pipelines/sourceAnalysis';
import { runClccPipeline } from '../pipelines/clccGeneration';
import {
  validateRealizationEntry,
  RU_PROFILE,
  FA_PROFILE,
  FR_PROFILE,
} from '../validation';
import type { ValidatedEntry, LanguageProfile } from '../validation';
import type { JobState } from '../jobManager';

// Back-compat wrappers: the round-1 helpers now live in the validation engine.
// These delegate to the engine + RU_PROFILE so the existing helper-level tests
// keep exercising the same logic through the new centralized framework.
const KNOWN_CODES = new Set<string>(['X']);
function checkRuEntry(
  surfaceForm: string,
  transliteration: string | undefined,
  grammaticalNote: string,
): ReturnType<typeof validateRealizationEntry> {
  const entry: ValidatedEntry = {
    coreConceptCode: 'X',
    realizationType: 'word',
    surfaceForm,
    transliteration,
    gloss: 'gloss',
    grammaticalNote,
  };
  return validateRealizationEntry(entry, RU_PROFILE, KNOWN_CODES);
}
function rejectRussianSurfaceFormNoCyrillic(surfaceForm: string): string | null {
  const r = checkRuEntry(surfaceForm, undefined, 'lexeme').rejections.find(
    (x) => x.code === 'SCRIPT_NONE_NATIVE',
  );
  return r ? r.reason : null;
}
function rejectTransliterationMismatch(
  surfaceForm: string,
  transliteration: string,
): string | null {
  const r = checkRuEntry(surfaceForm, transliteration, 'lexeme').rejections.find(
    (x) => x.code === 'TRANSLIT_MISMATCH' || x.code === 'TRANSLIT_NON_LATIN',
  );
  return r ? r.reason : null;
}
function detectGrammarNoteContradictions(grammaticalNote: string): string[] {
  return checkRuEntry('быть', "byt'", grammaticalNote).rejections
    .filter((x) => x.code.startsWith('GRAMMAR_'))
    .map((x) => x.reason);
}
function rejectRussianRealizationDefects(entry: {
  surfaceForm: string;
  transliteration?: string;
  grammaticalNote: string;
}): string[] {
  return checkRuEntry(entry.surfaceForm, entry.transliteration, entry.grammaticalNote).rejections.map(
    (x) => x.reason,
  );
}

interface FakeOllamaOpts {
  /** Map of substring → response. First matching substring wins per call. */
  responses?: Record<string, string>;
  /** Optional per-keyword override returning different strings on each call. */
  responsesByCall?: Record<string, string[]>;
}

function fakeOllama(config: FakeOllamaOpts = {}) {
  const calls: string[] = [];
  const counts: Record<string, number> = {};
  return {
    calls,
    get callsCount() {
      return calls.length;
    },
    defaultModel: 'llama3.2:3b',
    async listModels() {
      return ['llama3.2:3b'];
    },
    async validateModel(_m: string) {
      // ok
    },
    async generate(callOpts: { prompt: string }) {
      calls.push(callOpts.prompt);
      // Determine the first matching key.
      const merged = { ...config.responsesByCall, ...config.responses };
      for (const key of Object.keys(merged)) {
        if (!callOpts.prompt.includes(key)) continue;
        if (config.responsesByCall && key in config.responsesByCall) {
          const arr = config.responsesByCall[key];
          const idx = (counts[key] ?? 0);
          counts[key] = idx + 1;
          if (idx < arr.length) {
            return { text: arr[idx], model: 'llama3.2:3b' };
          }
          // Fall through to single-response if exhausted.
        }
        if (config.responses && key in config.responses) {
          return { text: config.responses[key], model: 'llama3.2:3b' };
        }
      }
      throw new Error('No fake response matched');
    },
  };
}

describe('sourceAnalysis pipeline', () => {
  beforeEach(() => {
    (jobManager as unknown as { _resetForTests: () => void })._resetForTests();
  });

  it('runs all 9 stages in order and produces proposals', async () => {
    const ollama = fakeOllama({
      responses: {
        'Group them into sections': JSON.stringify({ sections: [{ ordinal: 1, sectionType: 'verse', label: null, lineOrdinals: [1] }] }),
        'linguistic segments': JSON.stringify({ segments: [] }),
        'Translate each': JSON.stringify({ translations: [] }),
        'canonical lemmas': JSON.stringify({ lemmas: [] }),
        'inflects from a lemma': JSON.stringify({ forms: [] }),
        'Tokenize': JSON.stringify({ tokens: [] }),
        'morphology summary': JSON.stringify({ morphology: [] }),
        'grammatical patterns': JSON.stringify({ grammarPatterns: [], conceptMappings: [] }),
        'source-derived study cards': JSON.stringify({ cards: [] }),
      },
    });
    const job: JobState = jobManager.create('p1', 'source_analysis', {});
    await runSourceAnalysisPipeline(
      job,
      {
        sourceId: 'src-1',
        targetLanguageCode: 'ru',
        translationLanguageCode: 'en',
        sourceContentChecksum: 'a'.repeat(64),
        sourceLineCount: 1,
        sourceLines: [{ ordinal: 1, rawText: 'привет' }],
      },
      { ollama },
    );
    expect(jobManager.get('p1')!.status).toBe('awaiting_review');
    expect(jobManager.get('p1')!.result?.proposalCounts.section).toBe(1);
    // 9 stages × 1 call each = 9
    expect(ollama.calls.length).toBe(9);
  });

  it('emits warning event when a stage fails after retries, but continues', async () => {
    const ollama = fakeOllama({}); // No matches; everything throws.
    const job = jobManager.create('p2', 'source_analysis', {});
    await runSourceAnalysisPipeline(
      job,
      {
        sourceId: 'src-1',
        targetLanguageCode: 'ru',
        translationLanguageCode: 'en',
        sourceContentChecksum: 'a'.repeat(64),
        sourceLineCount: 1,
        sourceLines: [{ ordinal: 1, rawText: 'x' }],
      },
      { ollama },
    );
    const events = jobManager.get('p2')!.events;
    expect(events.some((e) => e.severity === 'warning')).toBe(true);
    expect(jobManager.get('p2')!.status).toBe('awaiting_review');
    expect(jobManager.get('p2')!.result?.proposals.length).toBe(0);
  });
});

// ── CLCC generation ────────────────────────────────────────────────────

/** Well-formed entry matching the strict RealizationEntrySchema (DB enum + non-empty gloss/grammaticalNote). */
const wellFormedExist = {
  coreConceptCode: 'EXIST',
  realizationType: 'word',
  surfaceForm: 'быть',
  gloss: 'to be (existential copula)',
  grammaticalNote: 'verb, infinitive, imperfective aspect',
  senseKind: 'core',
};

/**
 * Same fixture with transliteration populated (ISO 9 romanization for ru).
 * The transliteration field is optional in the schema so models can omit it
 * for Latin-script languages; for ru the prompt asks for it explicitly.
 */
const wellFormedExistWithTransliteration = {
  ...wellFormedExist,
  transliteration: "byt'",
};

describe('clccGeneration pipeline', () => {
  beforeEach(() => {
    (jobManager as unknown as { _resetForTests: () => void })._resetForTests();
  });

  it('runs all 5 stages and produces realization proposals', async () => {
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Romance', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExist] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c1', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'fr', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    expect(jobManager.get('c1')!.status).toBe('awaiting_review');
    expect(jobManager.get('c1')!.result?.proposals.length).toBe(1);
    expect(jobManager.get('c1')!.result?.proposals[0].proposalKind).toBe('realization');
    // Payload uses the DB enum directly — no 'lexical'/'syntactic' vocabulary.
    const payload = jobManager.get('c1')!.result?.proposals[0].payload as Record<string, unknown>;
    expect(payload.realizationType).toBe('word');
    expect(payload.gloss).toBe('to be (existential copula)');
  });

  it('drops malformed entries (null gloss) and retries once for the missing code', async () => {
    // First stage-2 call returns an entry with empty gloss → fails strict validation.
    // Retry call returns a well-formed entry → accepted.
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              { ...wellFormedExist, gloss: '' }, // fails .min(1)
            ],
          }),
          JSON.stringify({ realizations: [wellFormedExist] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c2', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c2')!;
    expect(result.status).toBe('awaiting_review');
    expect(result.result?.proposals.length).toBe(1);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.batchRetries).toBe(1);
    // At least one warning event for the malformed first pass.
    expect(result.events.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('rejects hybrid-junk surfaceForms like "likedat"', async () => {
    // First call returns "likedat" — pure ASCII, fails the hybrid-junk heuristic.
    // Retry returns a real Russian word.
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              { ...wellFormedExist, surfaceForm: 'likedat' },
            ],
          }),
          JSON.stringify({ realizations: [wellFormedExist] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c3', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c3')!;
    expect(result.result?.proposals.length).toBe(1);
    const payload = result.result?.proposals[0].payload as Record<string, unknown>;
    expect(payload.surfaceForm).toBe('быть');
  });

  it('drops the entire batch when both attempts return unparseable JSON', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': ['not json at all', 'also not json'],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 0, notes: null } }),
      },
    });
    const job = jobManager.create('c4', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c4')!;
    expect(result.status).toBe('awaiting_review');
    expect(result.result?.proposals.length).toBe(0);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.dropped).toBe(1);
    expect(summary.accepted).toBe(0);
  });

  it('batches large concept lists into multiple stage-2 calls', async () => {
    // 8 concepts → 2 batches (6 + 2). Both batches return well-formed entries
    // for the codes in the request. The fake matches by keyword, so the same
    // response shape is returned for every stage-2 call — we generate it
    // dynamically based on the codes mentioned in the prompt.
    const allCodes = ['EXIST', 'NEGATION', 'WANT', 'SEE', 'HEAR', 'KNOW', 'GO', 'COME'];
    const meta = allCodes.map((code) => ({
      code,
      canonicalLabel: code,
      description: 'test',
    }));
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 8, realizationCount: 8, notes: null } }),
      },
    });
    // Override generate to return a dynamic stage-2 response built from whichever
    // codes appear in the prompt. Push to the same calls[] the original uses.
    const originalGenerate = ollama.generate.bind(ollama);
    (ollama as { generate: (o: { prompt: string }) => Promise<{ text: string; model: string }> }).generate = async (callOpts: { prompt: string }) => {
      if (callOpts.prompt.includes('Concepts to realize')) {
        ollama.calls.push(callOpts.prompt);
        const presentCodes = allCodes.filter((c) => callOpts.prompt.includes(c));
        return {
          text: JSON.stringify({
            realizations: presentCodes.map((code) => ({
              coreConceptCode: code,
              realizationType: 'word',
              surfaceForm: 'быть',
              gloss: `gloss-${code}`,
              grammaticalNote: 'verb',
              senseKind: 'core',
            })),
          }),
          model: 'llama3.2:3b',
        };
      }
      return originalGenerate(callOpts);
    };
    const job = jobManager.create('c5', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: allCodes, coreConcepts: meta },
      { ollama },
    );
    const result = jobManager.get('c5')!;
    expect(result.status).toBe('awaiting_review');
    expect(result.result?.proposals.length).toBe(8);
    // 5 stages, but stage 2 made 2 batch calls (6+2).
    const stage2Calls = ollama.calls.filter((p) => p.includes('Concepts to realize'));
    expect(stage2Calls.length).toBe(2);
  });

  // ── Stage-3 (example sentences) tests ──────────────────────────────────
  //
  // Stage 3 is the load-bearing example-sentence generator. These tests
  // verify the new strict-validation + batching + script-aware junk filter
  // behavior added alongside the rewritten Stage 3 prompt.

  it('stage 3 emits example proposals alongside realization proposals', async () => {
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExist] }),
        'example': JSON.stringify({
          examples: [{
            coreConceptCode: 'EXIST',
            sourceText: 'В Москве есть метро.',
            translation: 'There is a metro in Moscow.',
          }],
        }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c6', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c6')!;
    expect(result.status).toBe('awaiting_review');
    // 1 realization + 1 example = 2 proposals.
    expect(result.result?.proposals.length).toBe(2);
    const kinds = result.result?.proposals.map((p) => p.proposalKind).sort();
    expect(kinds).toEqual(['example', 'realization']);
    const exampleProposal = result.result?.proposals.find((p) => p.proposalKind === 'example');
    const examplePayload = exampleProposal?.payload as Record<string, unknown>;
    expect(examplePayload.sourceText).toBe('В Москве есть метро.');
    expect(examplePayload.translation).toBe('There is a metro in Moscow.');
    // realizationSurfaceForm is the anchor from Stage 2.
    expect(examplePayload.realizationSurfaceForm).toBe('быть');
    expect(examplePayload.languageCode).toBe('ru');
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.exampleCount).toBe(1);
    expect(summary.acceptedExamples).toBe(1);
    expect(summary.droppedExampleCount).toBe(0);
  });

  it('stage 3 rejects Latin-only Russian source text via the script-aware junk filter', async () => {
    // First attempt returns a Latin-only transliteration — fails the ru
    // script check (requires at least one Cyrillic char). Retry returns
    // a real Cyrillic sentence → accepted.
    const ollama = fakeOllama({
      responsesByCall: {
        'example': [
          JSON.stringify({
            examples: [{
              coreConceptCode: 'EXIST',
              sourceText: 'Ya idu domoy.',
              translation: 'I am going home.',
            }],
          }),
          JSON.stringify({
            examples: [{
              coreConceptCode: 'EXIST',
              sourceText: 'В Москве есть метро.',
              translation: 'There is a metro in Moscow.',
            }],
          }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExist] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c7', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c7')!;
    // 1 realization + 1 example (after retry) = 2 proposals.
    expect(result.result?.proposals.length).toBe(2);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.exampleBatchRetries).toBe(1);
    expect(summary.acceptedExamples).toBe(1);
    // The retry masked the first-pass drop (consistent with Stage 2's
    // acceptedCodes filter), but the batch emitted a warning at the time.
    expect(result.events.some((e) => e.stage === 'Example sentences' && e.severity === 'warning')).toBe(true);
  });

  it('stage 3 rejects Latin-only Persian source text via the script-aware junk filter', async () => {
    // Persian requires Arabic-script chars. Latin-only transliteration is rejected.
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Iranian', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({
          realizations: [{
            coreConceptCode: 'EXIST',
            realizationType: 'word',
            surfaceForm: 'بودن',
            gloss: 'to be',
            grammaticalNote: 'verb, infinitive',
            senseKind: 'core',
          }],
        }),
        // Both attempts return Latin-only Persian transliteration.
        'example': JSON.stringify({
          examples: [{
            coreConceptCode: 'EXIST',
            sourceText: 'Man miram khune.',
            translation: 'I am going home.',
          }],
        }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c8', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'fa', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c8')!;
    // 1 realization + 0 examples (both attempts failed script check).
    expect(result.result?.proposals.length).toBe(1);
    expect(result.result?.proposals[0].proposalKind).toBe('realization');
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.acceptedExamples).toBe(0);
    // EXIST was dropped on both the first attempt and the retry → 2 drop records.
    expect(summary.droppedExampleCount).toBe(2);
    const droppedExamples = summary.droppedExamples as Array<{ code: string; reason: string }>;
    expect(droppedExamples.every((d) => d.code === 'EXIST' && d.reason.includes('script-aware junk filter'))).toBe(true);
  });

  it('stage 3 batches large realization sets into multiple calls', async () => {
    // 8 realizations → 2 stage-3 batches (5+3) at STAGE3_BATCH_SIZE=5.
    const allCodes = ['EXIST', 'NEGATION', 'WANT', 'SEE', 'HEAR', 'KNOW', 'GO', 'COME'];
    const meta = allCodes.map((code) => ({
      code,
      canonicalLabel: code,
      description: 'test',
    }));
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 8, realizationCount: 8, notes: null } }),
      },
    });
    // Override generate to return dynamic stage-2 and stage-3 responses
    // built from whichever codes appear in the prompt.
    const originalGenerate = ollama.generate.bind(ollama);
    (ollama as { generate: (o: { prompt: string }) => Promise<{ text: string; model: string }> }).generate = async (callOpts: { prompt: string }) => {
      if (callOpts.prompt.includes('Concepts to realize')) {
        ollama.calls.push(callOpts.prompt);
        const presentCodes = allCodes.filter((c) => callOpts.prompt.includes(c));
        return {
          text: JSON.stringify({
            realizations: presentCodes.map((code) => ({
              coreConceptCode: code,
              realizationType: 'word',
              surfaceForm: 'быть',
              gloss: `gloss-${code}`,
              grammaticalNote: 'verb',
              senseKind: 'core',
            })),
          }),
          model: 'llama3.2:3b',
        };
      }
      if (callOpts.prompt.includes('Concepts to illustrate')) {
        ollama.calls.push(callOpts.prompt);
        const presentCodes = allCodes.filter((c) => callOpts.prompt.includes(c));
        return {
          text: JSON.stringify({
            examples: presentCodes.map((code) => ({
              coreConceptCode: code,
              sourceText: 'В Москве есть метро.',
              translation: `translation-${code}`,
            })),
          }),
          model: 'llama3.2:3b',
        };
      }
      return originalGenerate(callOpts);
    };
    const job = jobManager.create('c9', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: allCodes, coreConcepts: meta },
      { ollama },
    );
    const result = jobManager.get('c9')!;
    expect(result.status).toBe('awaiting_review');
    // 8 realizations + 8 examples = 16 proposals.
    expect(result.result?.proposals.length).toBe(16);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.exampleCount).toBe(8);
    expect(summary.acceptedExamples).toBe(8);
    // Stage 3 made 2 batch calls (5+3).
    const stage3Calls = ollama.calls.filter((p) => p.includes('Concepts to illustrate'));
    expect(stage3Calls.length).toBe(2);
  });

  it('stage 3 is skipped when stage 2 produced no realizations', async () => {
    // Stage 2 returns unparseable JSON → 0 realizations. Stage 3 should
    // skip with a warning rather than attempt to generate examples for
    // codes with no anchor.
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': ['not json', 'also not json'],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({
          examples: [{
            coreConceptCode: 'EXIST',
            sourceText: 'В Москве есть метро.',
            translation: 'There is a metro in Moscow.',
          }],
        }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 0, notes: null } }),
      },
    });
    const job = jobManager.create('c10', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c10')!;
    // 0 realizations, 0 examples (stage 3 skipped).
    expect(result.result?.proposals.length).toBe(0);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.realizationCount).toBe(0);
    expect(summary.exampleCount).toBe(0);
    // Stage 3 was skipped — no example-related calls.
    const stage3Calls = ollama.calls.filter((p) => p.includes('Concepts to illustrate'));
    expect(stage3Calls.length).toBe(0);
    // A skip warning was emitted.
    expect(result.events.some((e) => e.stage === 'Example sentences' && e.payload?.reason === 'no_realizations')).toBe(true);
  });

  // ── Transliteration tests ──────────────────────────────────────────────
  //
  // The transliteration field is the Phase-1 addition for ru (ISO 9) and fa
  // (BGN/PCGN). It is optional in the schema so older callers and Latin-script
  // languages (fr) continue to validate cleanly. When the model emits it, it
  // must ride through to the proposal payload unchanged.

  it('stage 2 realization proposal carries transliteration when the model emits it', async () => {
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExistWithTransliteration] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c11', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c11')!;
    const payload = result.result?.proposals[0]?.payload as Record<string, unknown>;
    expect(payload.surfaceForm).toBe('быть');
    expect(payload.transliteration).toBe("byt'");
  });

  it('stage 2 accepts entries without transliteration (backwards compat / Latin-script languages)', async () => {
    // fr — transliteration is optional; the prompt allows omission for
    // Latin-script languages. The schema must not reject entries that omit it.
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Romance', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExist] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c12', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'fr', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c12')!;
    const payload = result.result?.proposals[0]?.payload as Record<string, unknown>;
    expect(payload.surfaceForm).toBe('быть');
    expect(payload.transliteration).toBeUndefined();
  });

  it('stage 3 example proposal carries transliteration when the model emits it', async () => {
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExistWithTransliteration] }),
        'example': JSON.stringify({
          examples: [{
            coreConceptCode: 'EXIST',
            sourceText: 'В Москве есть метро.',
            transliteration: "V Moskve yest' metro.",
            translation: 'There is a metro in Moscow.',
          }],
        }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c13', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c13')!;
    const exampleProposal = result.result?.proposals.find((p) => p.proposalKind === 'example');
    const examplePayload = exampleProposal?.payload as Record<string, unknown>;
    expect(examplePayload.sourceText).toBe('В Москве есть метро.');
    expect(examplePayload.transliteration).toBe("V Moskve yest' metro.");
  });

  it('stage 2 prompt for ru includes the ISO 9 transliteration instruction', async () => {
    // The prompt body is a load-bearing contract: it must tell the model
    // which scheme to use, and must distinguish transliteration from
    // pronunciation guidance (no IPA, no stress marks).
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExistWithTransliteration] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c14', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const stage2Call = ollama.calls.find((p) => p.includes('Concepts to realize'))!;
    expect(stage2Call).toContain('ISO 9');
    expect(stage2Call).toContain('transliteration');
    // Pronunciation guidance is explicitly excluded.
    expect(stage2Call).toContain('NOT IPA');
    expect(stage2Call).toContain('NOT stress marks');
  });

  it('stage 3 prompt for fr marks transliteration optional', async () => {
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Romance', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [wellFormedExist] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c15', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'fr', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const stage3Call = ollama.calls.find((p) => p.includes('Concepts to illustrate'))!;
    expect(stage3Call).toContain('transliteration');
    expect(stage3Call).toContain('OPTIONAL for French');
  });

  // ── Anti-hallucination hardening (ru realization integrity) ───────────────
  //
  // The next block covers the new deterministic post-generation validators
  // added to close the gap that let "likedat'", "zhity", and "verb, present
  // tense, nominative singular" through. Two layers:
  //   1. Isolated unit tests on each helper (script, transliteration, grammar).
  //   2. End-to-end Stage 2 tests using the six observed-bad rows from the
  //      operator's report — each must now be dropped with a specific reason.

  describe('rejectRussianSurfaceFormNoCyrillic', () => {
    it('rejects Latin-only surfaceForm ("likedat\'")', () => {
      const reason = rejectRussianSurfaceFormNoCyrillic("likedat'");
      expect(reason).not.toBeNull();
      expect(reason).toContain('no Cyrillic');
    });

    it('rejects ASCII-only transliteration passed as surfaceForm', () => {
      expect(rejectRussianSurfaceFormNoCyrillic('likedat')).not.toBeNull();
      expect(rejectRussianSurfaceFormNoCyrillic('zhity')).not.toBeNull();
    });

    it('accepts genuine Cyrillic surfaceForm', () => {
      expect(rejectRussianSurfaceFormNoCyrillic('быть')).toBeNull();
      expect(rejectRussianSurfaceFormNoCyrillic('знать')).toBeNull();
      expect(rejectRussianSurfaceFormNoCyrillic('внутри')).toBeNull();
    });
  });

  describe('rejectTransliterationMismatch', () => {
    it('rejects "zhity" for "жить" (wrong ISO 9)', () => {
      const reason = rejectTransliterationMismatch('жить', 'zhity');
      expect(reason).not.toBeNull();
      expect(reason).toContain('does not match ISO 9');
    });

    it('accepts correct ISO 9 transliterations', () => {
      expect(rejectTransliterationMismatch('быть', "byt'")).toBeNull();
      expect(rejectTransliterationMismatch('знать', "znat'")).toBeNull();
      expect(rejectTransliterationMismatch('жить', "zhit'")).toBeNull();
      expect(rejectTransliterationMismatch('не', 'ne')).toBeNull();
      expect(rejectTransliterationMismatch('я', 'ya')).toBeNull();
    });

    it('accepts transliteration with apostrophe/hyphen variants', () => {
      // Soft sign may appear as ' or be omitted — both should pass.
      expect(rejectTransliterationMismatch('жить', 'zhit')).toBeNull();
      expect(rejectTransliterationMismatch('жить', "zhit'")).toBeNull();
    });

    it('rejects empty transliteration (no Latin letters after normalization)', () => {
      const reason = rejectTransliterationMismatch('быть', '---');
      expect(reason).not.toBeNull();
      expect(reason).toContain('no Latin letters');
    });

    it('returns null when surfaceForm has no Cyrillic (other check rejects)', () => {
      // Delegates to the script check; shouldn't double-flag.
      expect(rejectTransliterationMismatch('likedat', 'likedat')).toBeNull();
    });

    it('tolerates ё→yo expansion for ё-bearing surfaceForms', () => {
      // "сёл" → ISO 9 with ё→e gives "sel"; model emitting "syol" (ё→yo) is OK.
      expect(rejectTransliterationMismatch('сёл', 'syol')).toBeNull();
      expect(rejectTransliterationMismatch('ёж', 'yozh')).toBeNull();
    });

    it('accepts common model variants within per-length tolerance (run #21 regression)', () => {
      // х→"h" instead of "kh"; doubled consonants collapsed ("сс"→"s"). With
      // surfaceForm length 10 the tolerance floor is 2, so diff=1 passes.
      expect(rejectTransliterationMismatch('переходить', 'perehodit')).toBeNull();
      expect(rejectTransliterationMismatch('рассказать', 'raskazat')).toBeNull();
    });
  });

  describe('detectGrammarNoteContradictions', () => {
    it('flags infinitive + present tense + nominative singular', () => {
      const contradictions = detectGrammarNoteContradictions(
        'verb, present tense, nominative singular',
      );
      // This note doesn't say "infinitive" — it's the "verb + case+number" check.
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0]).toContain('case + number');
    });

    it('flags "verb, infinitive, first person singular" (person/number still contradiction)', () => {
      const contradictions = detectGrammarNoteContradictions(
        'verb, infinitive, present tense, first person singular',
      );
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0]).toContain('infinitive');
    });

    it('does NOT flag "verb, infinitive, present tense" alone (run #21 regression)', () => {
      // Tense removed from infinitive's forbiddenProps: models routinely tag
      // imperfective infinitives as "present tense" even though the surface
      // form is a valid infinitive. Only person/number/case remain contradictory.
      expect(detectGrammarNoteContradictions('verb, infinitive, present tense')).toEqual([]);
    });

    it('flags "adverb, prepositional case"', () => {
      const contradictions = detectGrammarNoteContradictions('adverb, prepositional case');
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0]).toContain('adverb');
    });

    it('does NOT flag "verb, infinitive, imperfective aspect" (clean)', () => {
      // Aspect + infinitive is a valid combination.
      expect(detectGrammarNoteContradictions('verb, infinitive, imperfective aspect')).toEqual([]);
    });

    it('does NOT flag "verb, past tense, feminine singular" (clean)', () => {
      // Past-tense verbs inflect for gender/number; no case mentioned.
      expect(detectGrammarNoteContradictions('verb, past tense, feminine singular')).toEqual([]);
    });

    it('does NOT flag "preposition, genitive case" (clean)', () => {
      expect(detectGrammarNoteContradictions('preposition, genitive case')).toEqual([]);
    });

    it('does NOT flag "noun, nominative singular" (clean)', () => {
      expect(detectGrammarNoteContradictions('noun, nominative singular, masculine')).toEqual([]);
    });

    it('flags "noun, present tense" (nouns are not tensed)', () => {
      const contradictions = detectGrammarNoteContradictions('noun, present tense, masculine');
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0]).toContain('noun');
    });
  });

  describe('rejectRussianRealizationDefects (combined)', () => {
    it('rejects "likedat\'" + "likdat\'" (no Cyrillic + bad transliteration)', () => {
      const reasons = rejectRussianRealizationDefects({
        surfaceForm: "likedat'",
        transliteration: "likdat'",
        grammaticalNote: 'verb, present tense, imperfective aspect, first person singular',
      });
      // Multiple defects surface; the script check must fire.
      expect(reasons.some((r) => r.includes('no Cyrillic'))).toBe(true);
    });

    it('rejects "знать" with verb+nominative+singular contradiction', () => {
      const reasons = rejectRussianRealizationDefects({
        surfaceForm: 'знать',
        transliteration: "znat'",
        grammaticalNote: 'verb, present tense, nominative singular',
      });
      expect(reasons.some((r) => r.includes('case + number'))).toBe(true);
    });

    it('rejects "внутри" with adverb+case contradiction', () => {
      const reasons = rejectRussianRealizationDefects({
        surfaceForm: 'внутри',
        transliteration: 'vnutri',
        grammaticalNote: 'adverb, prepositional case',
      });
      expect(reasons.some((r) => r.includes('adverb'))).toBe(true);
    });

    it('rejects "на" with adverb+case contradiction', () => {
      const reasons = rejectRussianRealizationDefects({
        surfaceForm: 'на',
        transliteration: 'na',
        grammaticalNote: 'adverb, prepositional case',
      });
      expect(reasons.some((r) => r.includes('adverb'))).toBe(true);
    });

    it('rejects "жить" / "zhity" transliteration mismatch', () => {
      const reasons = rejectRussianRealizationDefects({
        surfaceForm: 'жить',
        transliteration: 'zhity',
        grammaticalNote: 'verb, infinitive, imperfective aspect',
      });
      expect(reasons.some((r) => r.includes('does not match ISO 9'))).toBe(true);
    });

    it('accepts clean canonical rows', () => {
      // быть / byt' / verb, infinitive, imperfective aspect
      expect(
        rejectRussianRealizationDefects({
          surfaceForm: 'быть',
          transliteration: "byt'",
          grammaticalNote: 'verb, infinitive, imperfective aspect',
        }),
      ).toEqual([]);

      // не / ne / negation particle, proclitic, unstressed
      expect(
        rejectRussianRealizationDefects({
          surfaceForm: 'не',
          transliteration: 'ne',
          grammaticalNote: 'negation particle, proclitic, unstressed',
        }),
      ).toEqual([]);

      // я / ya / personal pronoun, nominative case, singular
      expect(
        rejectRussianRealizationDefects({
          surfaceForm: 'я',
          transliteration: 'ya',
          grammaticalNote: 'personal pronoun, nominative case, singular',
        }),
      ).toEqual([]);

      // знать / znat' / verb, infinitive, imperfective aspect — clean case from operator report
      expect(
        rejectRussianRealizationDefects({
          surfaceForm: 'знать',
          transliteration: "znat'",
          grammaticalNote: 'verb, infinitive, imperfective aspect',
        }),
      ).toEqual([]);
    });
  });

  // ── End-to-end: bad rows from the operator's report are now dropped ────────
  //
  // These mirror the "rejects hybrid-junk surfaceForms like 'likedat'" test
  // above but cover the new ru-integrity checks. The model emits the bad row
  // on the first Stage 2 attempt and a clean replacement on the retry; the
  // pipeline must end with the clean row accepted and the bad row's code
  // visible in the dropped log.

  /** Helper: builds a well-formed entry for code EXIST with surfaceForm "быть". */
  const cleanExistRu = {
    coreConceptCode: 'EXIST',
    realizationType: 'word',
    surfaceForm: 'быть',
    transliteration: "byt'",
    gloss: 'to be (existential copula)',
    grammaticalNote: 'verb, infinitive, imperfective aspect',
    senseKind: 'core',
  };

  it('Stage 2 drops "likedat\'" (apostrophe-bearing hybrid junk, ru)', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              {
                coreConceptCode: 'EXIST',
                realizationType: 'word',
                surfaceForm: "likedat'",
                transliteration: "likdat'",
                gloss: 'to like or prefer',
                grammaticalNote: 'verb, present tense, imperfective aspect, first person singular',
                senseKind: 'core',
              },
            ],
          }),
          JSON.stringify({ realizations: [cleanExistRu] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-h1', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c-h1')!;
    // The clean retry wins — bad row is rejected, not silently accepted.
    expect(result.result?.proposals.length).toBe(1);
    const payload = result.result?.proposals[0].payload as Record<string, unknown>;
    expect(payload.surfaceForm).toBe('быть');
    // A warning event was emitted and its payload carries the bad row's drop reason.
    // (The summary.droppedCodes is empty because retry succeeded, but the per-batch
    // event log preserves the reason for operator forensics.)
    const warningEvents = result.events.filter((e) => e.severity === 'warning');
    expect(warningEvents.length).toBeGreaterThan(0);
    const droppedInEvents = warningEvents.flatMap(
      (e) => (e.payload?.dropped as Array<{ code: string; reason: string }>) ?? [],
    );
    // The hybrid-junk regex (now apostrophe-tolerant) catches "likedat'" before
    // the ru-integrity check fires. Either reason correctly rejects the row.
    expect(
      droppedInEvents.some(
        (d) => d.reason.includes('hybrid junk') || d.reason.includes('no Cyrillic'),
      ),
    ).toBe(true);
  });

  it('Stage 2 drops transliteration mismatch "zhity" for "жить"', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              {
                coreConceptCode: 'EXIST',
                realizationType: 'word',
                surfaceForm: 'жить',
                transliteration: 'zhity',
                gloss: 'to live or stay',
                grammaticalNote: 'verb, infinitive, imperfective aspect',
                senseKind: 'core',
              },
            ],
          }),
          JSON.stringify({ realizations: [cleanExistRu] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-h2', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c-h2')!;
    expect(result.result?.proposals.length).toBe(1);
    expect(
      (result.result?.proposals[0].payload as Record<string, unknown>).surfaceForm,
    ).toBe('быть');
    const warningEvents = result.events.filter((e) => e.severity === 'warning');
    const droppedInEvents = warningEvents.flatMap(
      (e) => (e.payload?.dropped as Array<{ code: string; reason: string }>) ?? [],
    );
    expect(droppedInEvents.some((d) => d.reason.includes('does not match ISO 9'))).toBe(true);
  });

  it('Stage 2 drops grammar contradiction "verb, present tense, nominative singular"', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              {
                coreConceptCode: 'EXIST',
                realizationType: 'word',
                surfaceForm: 'знать',
                transliteration: "znat'",
                gloss: 'cognition of a fact or person',
                grammaticalNote: 'verb, present tense, nominative singular',
                senseKind: 'core',
              },
            ],
          }),
          JSON.stringify({ realizations: [cleanExistRu] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-h3', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c-h3')!;
    expect(result.result?.proposals.length).toBe(1);
    expect(
      (result.result?.proposals[0].payload as Record<string, unknown>).surfaceForm,
    ).toBe('быть');
    const warningEvents = result.events.filter((e) => e.severity === 'warning');
    const droppedInEvents = warningEvents.flatMap(
      (e) => (e.payload?.dropped as Array<{ code: string; reason: string }>) ?? [],
    );
    expect(droppedInEvents.some((d) => d.reason.includes('case + number'))).toBe(true);
  });

  it('Stage 2 drops adverb+case contradiction (внутри / "adverb, prepositional case")', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              {
                coreConceptCode: 'EXIST',
                realizationType: 'word',
                surfaceForm: 'внутри',
                transliteration: 'vnutri',
                gloss: 'in a container or area',
                grammaticalNote: 'adverb, prepositional case',
                senseKind: 'core',
              },
            ],
          }),
          JSON.stringify({ realizations: [cleanExistRu] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-h4', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c-h4')!;
    expect(result.result?.proposals.length).toBe(1);
    expect(
      (result.result?.proposals[0].payload as Record<string, unknown>).surfaceForm,
    ).toBe('быть');
    const warningEvents = result.events.filter((e) => e.severity === 'warning');
    const droppedInEvents = warningEvents.flatMap(
      (e) => (e.payload?.dropped as Array<{ code: string; reason: string }>) ?? [],
    );
    expect(droppedInEvents.some((d) => d.reason.includes('adverb'))).toBe(true);
  });

  it('Stage 2 still accepts a clean canonical ru row without dropping it', async () => {
    // Regression guard: the new checks must not false-positive on clean rows
    // that the operator reported as good (быть, не, я).
    const ollama = fakeOllama({
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'Concepts to realize': JSON.stringify({ realizations: [cleanExistRu] }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-h5', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    const result = jobManager.get('c-h5')!;
    expect(result.result?.proposals.length).toBe(1);
    const summary = result.result?.summary as Record<string, unknown>;
    expect(summary.dropped).toBe(0);
  });

  // ── Round-2 validators (profile-driven engine) ──────────────────────────
  //
  // New rules added by the centralized validation framework. Each exercises a
  // rule mechanism with a synthetic case constructed to fire it — they do NOT
  // bind to specific concept codes or surfaceForm values, proving the rules
  // are general. See validation/profiles/ru.ts for the rule data.

  /** Clean Russian row: passes every configured rule. Base for mutating below. */
  const cleanRuEntry: ValidatedEntry = {
    coreConceptCode: 'X',
    realizationType: 'word',
    surfaceForm: 'быть',
    transliteration: "byt'",
    gloss: 'to be',
    grammaticalNote: 'verb, infinitive, imperfective aspect',
  };

  describe('SCRIPT_MIXED (mixed Cyrillic+Latin in one token)', () => {
    it('rejects the reported "могlichkeit" case', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, surfaceForm: 'могlichkeit', transliteration: 'moglichkeit' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.verdict).toBe('malformed');
      expect(r.skipReview).toBe(true);
      expect(r.rejections.some((x) => x.code === 'SCRIPT_MIXED')).toBe(true);
    });

    it('rejects synthetic mixed-script tokens (generality guard)', () => {
      for (const sf of ['xnaxelihood', 'ruslatination', 'amixb']) {
        // Construct a token with both Cyrillic and Latin chunks.
        const mixed = 'на' + sf;
        const r = validateRealizationEntry(
          { ...cleanRuEntry, surfaceForm: mixed, transliteration: 'na' + sf },
          RU_PROFILE,
          KNOWN_CODES,
        );
        expect(r.rejections.some((x) => x.code === 'SCRIPT_MIXED')).toBe(true);
      }
    });
  });

  describe('POS-extension grammar rules (preposition/adverb/conjunction/numeral/cardinal/ordinal/particle)', () => {
    it('rejects "preposition, present tense" (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'preposition, present tense' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_POS_PROP_CONTRADICTION')).toBe(true);
    });

    it('rejects "conjunction, present tense" (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'conjunction, present tense' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_POS_PROP_CONTRADICTION')).toBe(true);
    });

    it('rejects "numeral, present tense" (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'numeral, present tense' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_POS_PROP_CONTRADICTION')).toBe(true);
    });

    it('rejects "cardinal, first person" (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'cardinal, first person' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_POS_PROP_CONTRADICTION')).toBe(true);
    });

    it('rejects "particle, present tense" (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'particle, present tense' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_POS_PROP_CONTRADICTION')).toBe(true);
    });
  });

  describe('exclusive-category (multi-tense / multi-person)', () => {
    it('rejects "verb, present tense, past tense" (multi-tense, synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'verb, present tense, past tense' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_MULTI_TENSE')).toBe(true);
    });

    it('rejects "verb, first person, second person" (multi-person, synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, grammaticalNote: 'verb, first person, second person' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'GRAMMAR_MULTI_PERSON')).toBe(true);
    });
  });

  describe('REALIZATION_TYPE_SHAPE (word with whitespace)', () => {
    it('rejects realizationType "word" with a space (synthetic)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, surfaceForm: 'быть здесь', transliteration: 'byt zdes' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'REALIZATION_TYPE_SHAPE')).toBe(true);
    });

    it('accepts realizationType "phrase" with a space', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, realizationType: 'phrase', surfaceForm: 'быть здесь', transliteration: 'byt zdes' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.verdict).toBe('valid');
    });
  });

  describe('TRANSLIT_NON_LATIN (transliteration contains no Latin letters)', () => {
    it('rejects a Cyrillic transliteration (script leak)', () => {
      const r = validateRealizationEntry(
        { ...cleanRuEntry, transliteration: 'быть' },
        RU_PROFILE,
        KNOWN_CODES,
      );
      expect(r.rejections.some((x) => x.code === 'TRANSLIT_NON_LATIN')).toBe(true);
    });
  });

  // ── Retry-feedback (Stage 2 prompt carries prior rejection reasons) ──────
  //
  // When a code is dropped on first pass with a structured rejectionCode, the
  // retry prompt for that code includes the rejection reason text. This gives
  // the model an actionable, language-general signal to repair the defect.

  it('Stage 2 retry prompt includes the prior rejection reason', async () => {
    const ollama = fakeOllama({
      responsesByCall: {
        'Concepts to realize': [
          JSON.stringify({
            realizations: [
              {
                coreConceptCode: 'EXIST',
                realizationType: 'word',
                surfaceForm: 'могlichkeit',
                transliteration: 'moglichkeit',
                gloss: 'possibility',
                grammaticalNote: 'noun, nominative singular, neuter',
                senseKind: 'core',
              },
            ],
          }),
          JSON.stringify({ realizations: [cleanExistRu] }),
        ],
      },
      responses: {
        'Profile the': JSON.stringify({ profile: { languageFamily: 'Slavic', typologicalFeatures: [], notes: null } }),
        'example': JSON.stringify({ examples: [] }),
        'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
        'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
      },
    });
    const job = jobManager.create('c-rf', 'clcc_generation', {});
    await runClccPipeline(
      job,
      { targetLanguageCode: 'ru', coreConceptCodes: ['EXIST'] },
      { ollama },
    );
    // The retry (second 'Concepts to realize' call) must carry the prior
    // rejection code + reason so the model can avoid the exact error class.
    const stage2Calls = ollama.calls.filter((p) => p.includes('Concepts to realize'));
    expect(stage2Calls.length).toBe(2);
    const retryPrompt = stage2Calls[1];
    expect(retryPrompt).toContain('Prior attempt feedback');
    expect(retryPrompt).toContain('SCRIPT_MIXED');
    expect(retryPrompt).toContain('могlichkeit');
    // The clean retry wins.
    const result = jobManager.get('c-rf')!;
    expect(result.result?.proposals.length).toBe(1);
  });

  // ── Profile-coverage guard (language scalability) ─────────────────────────
  //
  // The engine must run without crashing for every registered profile. This is
  // the language-scalability guard: if a future profile is missing a required
  // field, this test catches it. RU is fully populated; FA/FR ship as minimal
  // stubs (script identity + word-shape rule, empty contradiction rules).

  describe.each([
    ['ru', RU_PROFILE, { surfaceForm: 'быть', transliteration: "byt'", note: 'verb, infinitive, imperfective aspect' }],
    ['fa', FA_PROFILE, { surfaceForm: 'بودن', transliteration: 'budan', note: 'verb, infinitive' }],
    ['fr', FR_PROFILE, { surfaceForm: 'être', transliteration: undefined, note: 'verb, infinitive' }],
  ] as const)('profile coverage for %s', (_code, profile, fixture) => {
    it('engine runs without crashing and accepts a clean row', () => {
      const r = validateRealizationEntry(
        {
          coreConceptCode: 'X',
          realizationType: 'word',
          surfaceForm: fixture.surfaceForm,
          transliteration: fixture.transliteration,
          gloss: 'gloss',
          grammaticalNote: fixture.note,
        },
        profile as LanguageProfile,
        KNOWN_CODES,
      );
      expect(r.verdict).toBe('valid');
      expect(r.rejections).toEqual([]);
    });
  });
});
