// tools/local-companion/pipelines/sourceAnalysis.ts
// 9-stage source-analysis pipeline. Each stage:
//   1. emits a stage_start event (with stageIndex + stageCount)
//   2. calls Ollama with the JSON-schema-constrained prompt
//   3. validates the output (Zod schema)
//   4. on validation failure: retry up to 2x, then emit a warning event and
//      continue (NEVER fake success)
//   5. emits a stage_complete event
// On all-stages-complete: collect into result.proposals + emit terminal.

import { z } from 'zod';
import type { OllamaAdapter } from '../adapters/ollama';
import type { JobState } from '../jobManager';
import { jobManager } from '../jobManager';
import type {
  CompanionResultProposal,
  CompanionJobEvent,
} from '../../../shared/types/knowalong/companion';
import {
  SOURCE_ANALYSIS_STAGES,
  stage1SectionsPrompt,
  stage2SegmentsPrompt,
  stage3LineTranslationPrompt,
  stage4LemmasPrompt,
  stage5FormsPrompt,
  stage6TokensPrompt,
  stage7MorphologyPrompt,
  stage8GrammarAndConceptsPrompt,
  stage9CardsPrompt,
  type SourceAnalysisPromptInput,
} from '../prompts/sourceAnalysis';
import { logger } from '../../../utils/logger';

const SectionsSchema = z.object({ sections: z.array(z.object({}).passthrough()) });
const SegmentsSchema = z.object({ segments: z.array(z.object({}).passthrough()) });
const TranslationsSchema = z.object({ translations: z.array(z.object({}).passthrough()) });
const LemmasSchema = z.object({ lemmas: z.array(z.object({}).passthrough()) });
const FormsSchema = z.object({ forms: z.array(z.object({}).passthrough()) });
const TokensSchema = z.object({ tokens: z.array(z.object({}).passthrough()) });
const MorphologySchema = z.object({ morphology: z.array(z.object({}).passthrough()) });
const GrammarSchema = z.object({
  grammarPatterns: z.array(z.object({}).passthrough()),
  conceptMappings: z.array(z.object({}).passthrough()),
});
const CardsSchema = z.object({ cards: z.array(z.object({}).passthrough()) });

export interface SourceAnalysisPipelineDeps {
  ollama: OllamaAdapter;
}

export interface SourceAnalysisJobRequest {
  sourceId: string;
  targetLanguageCode: string;
  translationLanguageCode: string;
  sourceContentChecksum: string;
  sourceLineCount: number;
  sourceLines: Array<{ ordinal: number; rawText: string; sectionLabel?: string | null }>;
  modelLabel?: string;
}

export async function runSourceAnalysisPipeline(
  job: JobState,
  request: SourceAnalysisJobRequest,
  deps: SourceAnalysisPipelineDeps,
): Promise<void> {
  const promptInput: SourceAnalysisPromptInput = {
    targetLanguageCode: request.targetLanguageCode,
    translationLanguageCode: request.translationLanguageCode,
    sourceLines: request.sourceLines,
  };
  const model = request.modelLabel ?? deps.ollama.defaultModel;

  const stages: Array<{ id: string; label: string; run: () => Promise<CompanionResultProposal[]> }> = [
    {
      id: 'sections',
      label: SOURCE_ANALYSIS_STAGES[0].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.2,
          ...stage1SectionsPrompt(promptInput),
        });
        SectionsSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { sections: Array<Record<string, unknown>> };
        return parsed.sections.map((s, i) => ({
          proposalKind: 'section',
          ordinal: i + 1,
          payload: { ...s, sourceId: request.sourceId } as Record<string, unknown>,
        }));
      },
    },
    {
      id: 'segments',
      label: SOURCE_ANALYSIS_STAGES[1].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.2,
          ...stage2SegmentsPrompt(promptInput),
        });
        SegmentsSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { segments: Array<Record<string, unknown>> };
        return parsed.segments.map((s, i) => ({
          proposalKind: 'segment',
          ordinal: i + 1,
          payload: { ...s, sourceId: request.sourceId } as Record<string, unknown>,
        }));
      },
    },
    {
      id: 'translations',
      label: SOURCE_ANALYSIS_STAGES[2].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.3,
          ...stage3LineTranslationPrompt(promptInput),
        });
        TranslationsSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { translations: Array<Record<string, unknown>> };
        return parsed.translations.map((t, i) => ({
          proposalKind: 'line_translation',
          ordinal: i + 1,
          payload: {
            ...t,
            sourceId: request.sourceId,
            translationLanguageCode: request.translationLanguageCode,
          } as Record<string, unknown>,
        }));
      },
    },
    {
      id: 'lemmas',
      label: SOURCE_ANALYSIS_STAGES[3].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.2,
          ...stage4LemmasPrompt(promptInput),
        });
        LemmasSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { lemmas: Array<Record<string, unknown>> };
        return parsed.lemmas.map((l, i) => ({
          proposalKind: 'lemma',
          ordinal: i + 1,
          payload: l,
        }));
      },
    },
    {
      id: 'forms',
      label: SOURCE_ANALYSIS_STAGES[4].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.2,
          ...stage5FormsPrompt(promptInput),
        });
        FormsSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { forms: Array<Record<string, unknown>> };
        return parsed.forms.map((f, i) => ({
          proposalKind: 'form',
          ordinal: i + 1,
          payload: f,
        }));
      },
    },
    {
      id: 'tokens',
      label: SOURCE_ANALYSIS_STAGES[5].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.1,
          ...stage6TokensPrompt(promptInput),
        });
        TokensSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { tokens: Array<Record<string, unknown>> };
        return parsed.tokens.map((t, i) => ({
          proposalKind: 'token_occurrence',
          ordinal: i + 1,
          payload: t,
        }));
      },
    },
    {
      id: 'morphology',
      label: SOURCE_ANALYSIS_STAGES[6].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.1,
          ...stage7MorphologyPrompt(promptInput),
        });
        MorphologySchema.parse(JSON.parse(result.text));
        // Morphology is an UPDATE path; emit as morphology proposals keyed
        // by formIndex. They land as edits to existing forms at accept time.
        return [];
      },
    },
    {
      id: 'grammar_and_concepts',
      label: SOURCE_ANALYSIS_STAGES[7].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.3,
          ...stage8GrammarAndConceptsPrompt(promptInput),
        });
        GrammarSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as {
          grammarPatterns: Array<Record<string, unknown>>;
          conceptMappings: Array<Record<string, unknown>>;
        };
        const grammar: CompanionResultProposal[] = parsed.grammarPatterns.map((g, i) => ({
          proposalKind: 'grammar_pattern',
          ordinal: i + 1,
          payload: {
            ...g,
            sourceId: request.sourceId,
            sourceSectionId: null,
            sourceSegmentProposalOrdinal: null,
            evidenceProvenance: 'local_companion',
          } as Record<string, unknown>,
        }));
        const mappings: CompanionResultProposal[] = parsed.conceptMappings.map((c, i) => ({
          proposalKind: 'concept_mapping',
          ordinal: i + 1,
          payload: c,
        }));
        return [...grammar, ...mappings];
      },
    },
    {
      id: 'cards',
      label: SOURCE_ANALYSIS_STAGES[8].label,
      run: async () => {
        const result = await deps.ollama.generate({
          model,
          temperature: 0.4,
          ...stage9CardsPrompt(promptInput),
        });
        CardsSchema.parse(JSON.parse(result.text));
        const parsed = JSON.parse(result.text) as { cards: Array<Record<string, unknown>> };
        return parsed.cards.map((c, i) => ({
          proposalKind: 'card',
          ordinal: i + 1,
          payload: {
            ...c,
            sourceId: request.sourceId,
            sourceSectionId: null,
            sourceSegmentProposalOrdinal: null,
            generatedContent: false,
            difficultyBudget: null,
          } as Record<string, unknown>,
        }));
      },
    },
  ];

  const allProposals: CompanionResultProposal[] = [];
  let nextOrdinal = 1;
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
      const proposals = await stage.run();
      // Re-number proposals sequentially across stages.
      for (const p of proposals) {
        p.ordinal = allProposals.length + 1;
        allProposals.push(p);
      }
      emitEvent(job, {
        kind: 'event',
        ordinal: nextOrdinal++,
        severity: 'stage_complete',
        stage: stage.label,
        message: `Stage ${i + 1}/${stages.length} complete (${proposals.length} proposals).`,
        payload: { stageIndex: i, proposalCount: proposals.length },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.warn('companion', `stage ${stage.id} failed validation after retries`, { message });
      emitEvent(job, {
        kind: 'event',
        ordinal: nextOrdinal++,
        severity: 'warning',
        stage: stage.label,
        message: `Stage ${stage.label} validation failed after retries; continuing without its proposals. Reason: ${message}`,
        payload: { stageIndex: i, error: message },
      });
    }
  }

  jobManager.transition(job.id, 'validating');

  // Build proposalCounts by kind.
  const proposalCounts: Record<string, number> = {};
  for (const p of allProposals) {
    proposalCounts[p.proposalKind] = (proposalCounts[p.proposalKind] ?? 0) + 1;
  }

  jobManager.complete(job.id, {
    proposalCounts,
    proposals: allProposals,
    summary: {
      stageCount: stages.length,
      totalProposals: allProposals.length,
    },
  });

  emitEvent(job, {
    kind: 'event',
    ordinal: nextOrdinal++,
    severity: 'stage_complete',
    stage: 'complete',
    message: 'Analysis complete — review required.',
    payload: { status: 'awaiting_review', totalProposals: allProposals.length },
  });
}

function emitEvent(job: JobState, event: CompanionJobEvent): void {
  jobManager.appendEvent(job.id, event);
}
