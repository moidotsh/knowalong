// tools/local-companion/pipelines/clccGeneration.ts
// 5-stage CLCC generation pipeline. Iterates Core Concepts from the request
// body. Realization proposals are persisted for review; CLCC promotion into
// concept_realizations is DEFERRED for this checkpoint.

import { z } from 'zod';
import type { OllamaAdapter } from '../adapters/ollama';
import type { JobState } from '../jobManager';
import { jobManager } from '../jobManager';
import type {
  CompanionResultProposal,
  CompanionJobEvent,
} from '../../../shared/types/knowalong/companion';
import {
  CLCC_STAGES,
  stage1LanguageProfilePrompt,
  stage2RealizationsPrompt,
  stage3ExamplesPrompt,
  stage4ValidationPrompt,
  stage5SummaryPrompt,
  type ClccPromptInput,
} from '../prompts/clccGeneration';
import { logger } from '../../../utils/logger';

const ProfileSchema = z.object({ profile: z.object({}).passthrough() });
const RealizationsSchema = z.object({ realizations: z.array(z.object({}).passthrough()) });
const ExamplesSchema = z.object({ examples: z.array(z.object({}).passthrough()) });
const ValidationSchema = z.object({
  missing: z.array(z.object({}).passthrough()),
  lowConfidence: z.array(z.object({}).passthrough()),
});
const SummarySchema = z.object({ summary: z.object({}).passthrough() });

export interface ClccPipelineDeps {
  ollama: OllamaAdapter;
}

export interface ClccJobRequest {
  targetLanguageCode: 'fr' | 'ru' | 'fa';
  coreConceptCodes: string[];
  existingRealizationSurfaceForms?: string[];
  modelLabel?: string;
}

export async function runClccPipeline(
  job: JobState,
  request: ClccJobRequest,
  deps: ClccPipelineDeps,
): Promise<void> {
  const promptInput: ClccPromptInput = {
    targetLanguageCode: request.targetLanguageCode,
    coreConceptCodes: request.coreConceptCodes,
    existingRealizationSurfaceForms: request.existingRealizationSurfaceForms,
  };
  const model = request.modelLabel ?? deps.ollama.defaultModel;
  let nextOrdinal = 1;

  const stages: Array<{ id: string; label: string; run: () => Promise<void> }> = [
    {
      id: 'profile',
      label: CLCC_STAGES[0].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.2, ...stage1LanguageProfilePrompt(promptInput) });
        ProfileSchema.parse(JSON.parse(r.text));
      },
    },
    {
      id: 'realizations',
      label: CLCC_STAGES[1].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.3, ...stage2RealizationsPrompt(promptInput) });
        RealizationsSchema.parse(JSON.parse(r.text));
        // Persist realization proposals for review. Acceptance is deferred.
        const parsed = JSON.parse(r.text) as { realizations: Array<Record<string, unknown>> };
        job.result = job.result ?? { proposalCounts: {}, proposals: [], summary: {} };
        for (const realization of parsed.realizations) {
          job.result.proposals.push({
            proposalKind: 'realization',
            ordinal: job.result.proposals.length + 1,
            payload: {
              ...realization,
              languageCode: request.targetLanguageCode,
              lemmaProposalOrdinal: null,
            },
          });
        }
      },
    },
    {
      id: 'examples',
      label: CLCC_STAGES[2].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.4, ...stage3ExamplesPrompt(promptInput) });
        ExamplesSchema.parse(JSON.parse(r.text));
      },
    },
    {
      id: 'validation',
      label: CLCC_STAGES[3].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.1, ...stage4ValidationPrompt(promptInput) });
        ValidationSchema.parse(JSON.parse(r.text));
      },
    },
    {
      id: 'summary',
      label: CLCC_STAGES[4].label,
      run: async () => {
        const r = await deps.ollama.generate({ model, temperature: 0.1, ...stage5SummaryPrompt(promptInput) });
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

  // Build proposalCounts from job.result (set by stage 2).
  const proposals = job.result?.proposals ?? [];
  const proposalCounts: Record<string, number> = {};
  for (const p of proposals) {
    proposalCounts[p.proposalKind] = (proposalCounts[p.proposalKind] ?? 0) + 1;
  }

  jobManager.complete(job.id, {
    proposalCounts,
    proposals,
    summary: {
      stageCount: stages.length,
      realizationCount: proposals.length,
      conceptCount: request.coreConceptCodes.length,
    },
  });

  emitEvent(job, {
    kind: 'event',
    ordinal: nextOrdinal++,
    severity: 'stage_complete',
    stage: 'complete',
    message: 'CLCC generation complete — review required.',
    payload: { status: 'awaiting_review', realizationCount: proposals.length },
  });
}

function emitEvent(job: JobState, event: CompanionJobEvent): void {
  jobManager.appendEvent(job.id, event);
}
