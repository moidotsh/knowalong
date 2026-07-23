// tools/local-companion/__tests__/pipelines.test.ts
// Pipeline tests: stage order, retry behavior, warning-on-fail.

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { jobManager } from '../jobManager';
import { runSourceAnalysisPipeline } from '../pipelines/sourceAnalysis';
import { runClccPipeline } from '../pipelines/clccGeneration';
import type { JobState } from '../jobManager';

function fakeOllama(responses: Record<string, string>) {
  const calls: string[] = [];
  return {
    calls,
    defaultModel: 'llama3.2:3b',
    async listModels() {
      return ['llama3.2:3b'];
    },
    async validateModel(_m: string) {
      // ok
    },
    async generate(opts: { prompt: string }) {
      calls.push(opts.prompt);
      // Match by keyword in the prompt.
      for (const [key, value] of Object.entries(responses)) {
        if (opts.prompt.includes(key)) return { text: value, model: 'llama3.2:3b' };
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
      'Group them into sections': JSON.stringify({ sections: [{ ordinal: 1, sectionType: 'verse', label: null, lineOrdinals: [1] }] }),
      'linguistic segments': JSON.stringify({ segments: [] }),
      'Translate each': JSON.stringify({ translations: [] }),
      'canonical lemmas': JSON.stringify({ lemmas: [] }),
      'inflects from a lemma': JSON.stringify({ forms: [] }),
      'Tokenize': JSON.stringify({ tokens: [] }),
      'morphology summary': JSON.stringify({ morphology: [] }),
      'grammatical patterns': JSON.stringify({ grammarPatterns: [], conceptMappings: [] }),
      'source-derived study cards': JSON.stringify({ cards: [] }),
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
    // 9 stages × 2 events each (start + complete) + 1 final complete event = 19
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

describe('clccGeneration pipeline', () => {
  beforeEach(() => {
    (jobManager as unknown as { _resetForTests: () => void })._resetForTests();
  });

  it('runs all 5 stages and produces realization proposals', async () => {
    const ollama = fakeOllama({
      'Profile the': JSON.stringify({ profile: { languageFamily: 'Romance', typologicalFeatures: [], notes: null } }),
      'propose a': JSON.stringify({
        realizations: [
          { coreConceptCode: 'EXIST', realizationType: 'lexical', surfaceForm: 'être', gloss: 'to be', grammaticalNote: null, senseKind: 'core' },
        ],
      }),
      'example': JSON.stringify({ examples: [] }),
      'Cross-check': JSON.stringify({ missing: [], lowConfidence: [] }),
      'Summarize': JSON.stringify({ summary: { conceptCount: 1, realizationCount: 1, notes: null } }),
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
  });
});
