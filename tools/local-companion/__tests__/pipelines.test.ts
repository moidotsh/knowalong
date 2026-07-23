// tools/local-companion/__tests__/pipelines.test.ts
// Pipeline tests: stage order, retry behavior, warning-on-fail, and the
// new stage-2 strict-validation + batching behavior.

import { describe, it, expect, beforeEach } from 'bun:test';
import { jobManager } from '../jobManager';
import { runSourceAnalysisPipeline } from '../pipelines/sourceAnalysis';
import { runClccPipeline } from '../pipelines/clccGeneration';
import type { JobState } from '../jobManager';

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
});
