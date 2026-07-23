// utils/supabase/repositories/demoAdapter.ts
// Fixture-backed implementations of every repository method shape.
// Returns the same RepositoryResult<T> contract as the real repositories
// so the delegation path (repository → demoAdapter) is transparent to
// callers. The adapter clones fixtures on write so demo-session mutations
// don't corrupt the shared fixture objects.

import type {
  LearningSource,
  SourceSection,
  SourceLine,
  LexicalLemma,
  LexicalForm,
  StudyCard,
  ReviewState,
  ReviewAttempt,
  CoreConcept,
  ConceptRealization,
  LearnerConceptProgress,
  CreateLyricDraftDTO,
  UpdateLearningSourceDTO,
  RecordReviewAttemptDTO,
  SourceSegment,
  SourceLineSegmentLink,
  AnalysisRun,
  AnalysisRunType,
  AnalysisRunStatus,
  AnalysisEvent,
  AnalysisEventSeverity,
  AnalysisProposal,
  AnalysisProposalKind,
  ReviewStatus,
  LexicalSense,
  GrammarPattern,
  LemmaConceptLink,
  SenseKind,
  EvidenceProvenance,
} from '../../../shared/types/knowalong';
import type { RepositoryResult } from './types';
import { ok, err, RepositoryErrorCode } from './types';
import type {
  CreateSourceAnalysisRunInput,
  CreateClccRunInput,
} from './analysisRunRepository';
import type { AppendBatchInput } from './analysisEventRepository';
import type { CreateBatchInput } from './analysisProposalRepository';
import type { CreateLexicalSenseInput } from './lexicalSenseRepository';
import type { CreateGrammarPatternInput } from './grammarPatternRepository';
import type { UpsertLemmaConceptLinkInput } from './lemmaConceptLinkRepository';
import {
  DEMO_SOURCE_ID,
  DEMO_USER_ID,
  demoSource,
  demoSections,
  demoLines,
  demoLemmas,
  demoForms,
  demoCards,
  demoReviewStates,
  demoCoreConcepts,
  demoConceptProgress,
} from '../../../shared/fixtures';

/** In-demo-session mutable copies so writes don't corrupt the shared fixtures. */
const demoState: {
  sources: LearningSource[];
  sections: SourceSection[];
  lines: SourceLine[];
  lemmas: LexicalLemma[];
  forms: LexicalForm[];
  cards: StudyCard[];
  reviewStates: ReviewState[];
  segments: SourceSegment[];
  lineSegmentLinks: SourceLineSegmentLink[];
  analysisRuns: AnalysisRun[];
  analysisEvents: AnalysisEvent[];
  analysisProposals: AnalysisProposal[];
  lexicalSenses: LexicalSense[];
  grammarPatterns: GrammarPattern[];
  lemmaConceptLinks: LemmaConceptLink[];
} = {
  sources: [{ ...demoSource }],
  sections: demoSections.map((s) => ({ ...s })),
  lines: demoLines.map((l) => ({ ...l })),
  lemmas: demoLemmas.map((m) => ({ ...m })),
  forms: demoForms.map((f) => ({ ...f })),
  cards: demoCards.map((c) => ({ ...c })),
  reviewStates: demoReviewStates.map((r) => ({ ...r })),
  segments: [],
  lineSegmentLinks: [],
  analysisRuns: [],
  analysisEvents: [],
  analysisProposals: [],
  lexicalSenses: [],
  grammarPatterns: [],
  lemmaConceptLinks: [],
};

function genId(): string {
  // Deterministic-enough demo ID. Not a real UUID; fine for demo session.
  return 'demo-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function hashText(text: string): string {
  // Lightweight non-crypto hash for the advisory content-hash field.
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return 'demo-' + (h >>> 0).toString(16);
}

function parseLyricLines(rawText: string): { text: string; sectionGuess: string | null }[] {
  // Naive line parser: splits on newlines, strips empties. Section guesses
  // are NOT produced here (analysis would do that); demo just returns lines.
  return rawText
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => ({ text: t, sectionGuess: null }));
}

export const demoAdapter = {
  learningSource: {
    async findAll(userId: string): Promise<RepositoryResult<LearningSource[]>> {
      return ok(demoState.sources.filter((s) => s.userId === userId).map((s) => ({ ...s })));
    },
    async findById(id: string, _userId: string): Promise<RepositoryResult<LearningSource | null>> {
      const found = demoState.sources.find((s) => s.id === id) ?? null;
      return ok(found ? { ...found } : null);
    },
    async createDraft(userId: string, input: CreateLyricDraftDTO): Promise<RepositoryResult<LearningSource>> {
      const now = new Date().toISOString();
      const id = genId();
      const source: LearningSource = {
        id,
        userId,
        sourceType: input.sourceType,
        title: input.title,
        artist: input.artist,
        targetLanguage: input.targetLanguage,
        translationLanguage: input.translationLanguage,
        notes: input.notes,
        sourceContentHash: hashText(input.rawText),
        processingStatus: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      demoState.sources.push(source);
      // Seed source_lines from the pasted text so the library + detail render.
      const parsed = parseLyricLines(input.rawText);
      parsed.forEach((p, i) => {
        demoState.lines.push({
          id: genId(),
          sourceId: id,
          sectionId: null,
          ordinal: i,
          rawText: p.text,
          normalizedText: null,
          translation: null,
          transliteration: null,
          reviewStatus: 'new',
          createdAt: now,
          updatedAt: now,
        });
      });
      return ok({ ...source });
    },
    async update(id: string, userId: string, input: UpdateLearningSourceDTO): Promise<RepositoryResult<LearningSource>> {
      const idx = demoState.sources.findIndex((s) => s.id === id && s.userId === userId);
      if (idx < 0) return err('Source not found', RepositoryErrorCode.NOT_FOUND);
      const updated: LearningSource = {
        ...demoState.sources[idx],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      demoState.sources[idx] = updated;
      return ok({ ...updated });
    },
    async archive(id: string, userId: string): Promise<RepositoryResult<LearningSource>> {
      return demoAdapter.learningSource.update(id, userId, { processingStatus: 'archived' });
    },
    async deleteSource(id: string, userId: string): Promise<RepositoryResult<void>> {
      const idx = demoState.sources.findIndex((s) => s.id === id && s.userId === userId);
      if (idx < 0) return err('Source not found', RepositoryErrorCode.NOT_FOUND);
      demoState.sources.splice(idx, 1);
      demoState.lines = demoState.lines.filter((l) => l.sourceId !== id);
      demoState.sections = demoState.sections.filter((s) => s.sourceId !== id);
      demoState.cards = demoState.cards.filter((c) => c.sourceId !== id);
      return ok(undefined);
    },
  },

  sourceSection: {
    async findBySource(sourceId: string, _userId: string): Promise<RepositoryResult<{ sections: SourceSection[]; lines: SourceLine[] }>> {
      return ok({
        sections: demoState.sections.filter((s) => s.sourceId === sourceId).map((s) => ({ ...s })),
        lines: demoState.lines.filter((l) => l.sourceId === sourceId).map((l) => ({ ...l })),
      });
    },
    async findById(id: string, _userId: string): Promise<RepositoryResult<SourceSection | null>> {
      const found = demoState.sections.find((s) => s.id === id) ?? null;
      return ok(found ? { ...found } : null);
    },
    async createFromProposal(userId: string, input: { sourceId: string; ordinal: number; sectionType: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'stanza' | 'section'; label: string | null; lineOrdinals: number[] }): Promise<RepositoryResult<SourceSection>> {
      void userId;
      void input.lineOrdinals;
      const now = new Date().toISOString();
      const section: SourceSection = {
        id: genId(),
        sourceId: input.sourceId,
        ordinal: input.ordinal,
        sectionType: input.sectionType,
        label: input.label,
        createdAt: now,
        updatedAt: now,
      };
      demoState.sections.push(section);
      return ok({ ...section });
    },
    async updateLineTranslation(_userId: string, input: { sourceLineId: string; translationText: string; translationLanguageCode: string }): Promise<RepositoryResult<{ sourceLineId: string }>> {
      const idx = demoState.lines.findIndex((l) => l.id === input.sourceLineId);
      if (idx < 0) return err('Source line not found.', RepositoryErrorCode.NOT_FOUND);
      demoState.lines[idx] = { ...demoState.lines[idx], translation: input.translationText };
      return ok({ sourceLineId: input.sourceLineId });
    },
  },

  vocabulary: {
    async findLemmasBySource(_sourceId: string, userId: string): Promise<RepositoryResult<LexicalLemma[]>> {
      return ok(demoState.lemmas.filter((l) => l.userId === userId).map((l) => ({ ...l })));
    },
    async findLemmaDetail(lemmaId: string, userId: string): Promise<RepositoryResult<{ lemma: LexicalLemma | null; forms: LexicalForm[] }>> {
      const lemma = demoState.lemmas.find((l) => l.id === lemmaId && l.userId === userId) ?? null;
      const forms = demoState.forms.filter((f) => f.lemmaId === lemmaId).map((f) => ({ ...f }));
      return ok({ lemma: lemma ? { ...lemma } : null, forms });
    },
    async findFormsByLemma(lemmaId: string, _userId: string): Promise<RepositoryResult<LexicalForm[]>> {
      return ok(demoState.forms.filter((f) => f.lemmaId === lemmaId).map((f) => ({ ...f })));
    },
    async findSourceLinesByLemma(lemmaId: string, _userId: string): Promise<RepositoryResult<SourceLine[]>> {
      const formIds = new Set(demoState.forms.filter((f) => f.lemmaId === lemmaId).map((f) => f.id));
      // In the fixture, token_occurrences aren't stored in demoState; resolve
      // via the seed fixtures' token list instead.
      // For the demo, return any line that mentions the lemma's surface forms.
      const surfaceForms = demoState.forms.filter((f) => formIds.has(f.id)).map((f) => f.surfaceForm);
      const lines = demoState.lines.filter((l) => surfaceForms.some((sf) => l.rawText.includes(sf))).map((l) => ({ ...l }));
      return ok(lines);
    },
    async findLemmaBySurface(
      userId: string,
      languageCode: string,
      normalizedLemma: string,
      partOfSpeech: string,
    ): Promise<RepositoryResult<string | undefined>> {
      const match = demoState.lemmas.find(
        (l) =>
          l.userId === userId &&
          l.languageCode === languageCode &&
          l.normalizedLemma === normalizedLemma &&
          l.partOfSpeech === partOfSpeech,
      );
      return ok(match?.id);
    },
    async createLemma(userId: string, input: { languageCode: string; normalizedLemma: string; partOfSpeech: string; primaryGloss: string | null; grammaticalGender: string | null; animacy: string | null; verbAspect: string | null }): Promise<RepositoryResult<string>> {
      const now = new Date().toISOString();
      const id = genId();
      demoState.lemmas.push({
        id,
        userId,
        languageCode: input.languageCode,
        normalizedLemma: input.normalizedLemma,
        partOfSpeech: input.partOfSpeech,
        primaryGloss: input.primaryGloss,
        grammaticalGender: input.grammaticalGender,
        animacy: input.animacy,
        verbAspect: input.verbAspect,
        createdAt: now,
        updatedAt: now,
      });
      return ok(id);
    },
    async createForm(_userId: string, input: { lemmaId: string; surfaceForm: string; morphologySummary: string | null; grammaticalCase: string | null; grammaticalNumber: string | null; grammaticalPerson: string | null; tense: string | null }): Promise<RepositoryResult<string>> {
      const id = genId();
      const now = new Date().toISOString();
      demoState.forms.push({
        id,
        lemmaId: input.lemmaId,
        surfaceForm: input.surfaceForm,
        morphologySummary: input.morphologySummary,
        grammaticalCase: input.grammaticalCase,
        grammaticalNumber: input.grammaticalNumber,
        grammaticalPerson: input.grammaticalPerson,
        tense: input.tense,
        createdAt: now,
        updatedAt: now,
      });
      return ok(id);
    },
    async updateFormMorphology(_userId: string, input: { lexicalFormId: string; morphologySummary: string }): Promise<RepositoryResult<string>> {
      const idx = demoState.forms.findIndex((f) => f.id === input.lexicalFormId);
      if (idx < 0) return err('Lexical form not found.', RepositoryErrorCode.NOT_FOUND);
      demoState.forms[idx] = { ...demoState.forms[idx], morphologySummary: input.morphologySummary };
      return ok(demoState.forms[idx].id);
    },
  },

  studyCard: {
    async findBySource(sourceId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
      return ok(demoState.cards.filter((c) => c.sourceId === sourceId && c.userId === userId).map((c) => ({ ...c })));
    },
    async findBySection(_sourceId: string, sectionId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
      return ok(demoState.cards.filter((c) => c.sourceSectionId === sectionId && c.userId === userId).map((c) => ({ ...c })));
    },
    async findDueQueue(userId: string, limit: number): Promise<RepositoryResult<StudyCard[]>> {
      const now = Date.now();
      const dueCardIds = new Set(
        demoState.reviewStates
          .filter((r) => {
            if (r.cardStatus === 'new' || r.cardStatus === 'learning') return true;
            if (r.dueAt) return new Date(r.dueAt).getTime() <= now;
            return false;
          })
          .map((r) => r.cardId),
      );
      return ok(demoState.cards.filter((c) => c.userId === userId && dueCardIds.has(c.id)).slice(0, limit).map((c) => ({ ...c })));
    },
    async findGeneratedTransferBySource(sourceId: string, userId: string): Promise<RepositoryResult<StudyCard[]>> {
      return ok(
        demoState.cards
          .filter((c) => c.sourceId === sourceId && c.userId === userId && c.generatedContent)
          .map((c) => ({ ...c })),
      );
    },
    async create(userId: string, input: Omit<StudyCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RepositoryResult<StudyCard>> {
      const now = new Date().toISOString();
      const card: StudyCard = {
        ...input,
        id: genId(),
        userId,
        createdAt: now,
        updatedAt: now,
      };
      demoState.cards.push(card);
      return ok({ ...card });
    },
  },

  sourceSegment: {
    async findBySource(sourceId: string, _userId: string): Promise<RepositoryResult<SourceSegment[]>> {
      return ok(
        demoState.segments
          .filter((s) => s.sourceId === sourceId)
          .map((s) => ({
            ...s,
            lineSpan: demoState.lineSegmentLinks.filter((l) => l.sourceSegmentId === s.id).map((l) => ({ ...l })),
          })),
      );
    },
    async deleteBySource(sourceId: string, _userId: string): Promise<RepositoryResult<void>> {
      const segmentIds = new Set(demoState.segments.filter((s) => s.sourceId === sourceId).map((s) => s.id));
      demoState.segments = demoState.segments.filter((s) => s.sourceId !== sourceId);
      demoState.lineSegmentLinks = demoState.lineSegmentLinks.filter((l) => !segmentIds.has(l.sourceSegmentId));
      return ok(undefined);
    },
  },

  analysisRun: {
    async createSourceAnalysisRun(input: CreateSourceAnalysisRunInput): Promise<RepositoryResult<AnalysisRun>> {
      const now = new Date().toISOString();
      const run: AnalysisRun = {
        id: genId(),
        userId: input.userId,
        sourceId: input.sourceId,
        runType: 'source_analysis',
        status: 'queued',
        targetLanguageCode: input.targetLanguageCode,
        modelLabel: input.modelLabel ?? null,
        companionVersion: null,
        companionJobId: null,
        sourceContentChecksum: input.sourceContentChecksum,
        sourceLineCount: input.sourceLineCount,
        requestedAt: now,
        startedAt: null,
        completedAt: null,
        failureReason: null,
        requestParams: input.requestParams ?? {},
        summary: null,
        createdAt: now,
        updatedAt: now,
      };
      demoState.analysisRuns.push(run);
      return ok({ ...run });
    },
    async createClccRun(input: CreateClccRunInput): Promise<RepositoryResult<AnalysisRun>> {
      const now = new Date().toISOString();
      const run: AnalysisRun = {
        id: genId(),
        userId: input.userId,
        sourceId: null,
        runType: 'clcc_generation',
        status: 'queued',
        targetLanguageCode: input.targetLanguageCode,
        modelLabel: input.modelLabel ?? null,
        companionVersion: null,
        companionJobId: null,
        sourceContentChecksum: null,
        sourceLineCount: null,
        requestedAt: now,
        startedAt: null,
        completedAt: null,
        failureReason: null,
        requestParams: input.requestParams ?? {},
        summary: null,
        createdAt: now,
        updatedAt: now,
      };
      demoState.analysisRuns.push(run);
      return ok({ ...run });
    },
    async findById(id: string, _userId: string): Promise<RepositoryResult<AnalysisRun | null>> {
      const run = demoState.analysisRuns.find((r) => r.id === id) ?? null;
      return ok(run ? { ...run } : null);
    },
    async updateStatus(
      id: string,
      _userId: string,
      patch: {
        status: AnalysisRunStatus;
        startedAt?: string | null;
        completedAt?: string | null;
        failureReason?: string | null;
        summary?: Record<string, unknown> | null;
        companionVersion?: string | null;
        companionJobId?: string | null;
        modelLabel?: string | null;
      },
    ): Promise<RepositoryResult<AnalysisRun>> {
      const idx = demoState.analysisRuns.findIndex((r) => r.id === id);
      if (idx < 0) return err('Run not found', RepositoryErrorCode.NOT_FOUND);
      const now = new Date().toISOString();
      const updated: AnalysisRun = {
        ...demoState.analysisRuns[idx],
        status: patch.status,
        startedAt: patch.startedAt !== undefined ? patch.startedAt : demoState.analysisRuns[idx].startedAt,
        completedAt: patch.completedAt !== undefined ? patch.completedAt : demoState.analysisRuns[idx].completedAt,
        failureReason: patch.failureReason !== undefined ? patch.failureReason : demoState.analysisRuns[idx].failureReason,
        summary: patch.summary !== undefined ? patch.summary : demoState.analysisRuns[idx].summary,
        companionVersion: patch.companionVersion !== undefined ? patch.companionVersion : demoState.analysisRuns[idx].companionVersion,
        companionJobId: patch.companionJobId !== undefined ? patch.companionJobId : demoState.analysisRuns[idx].companionJobId,
        modelLabel: patch.modelLabel !== undefined ? patch.modelLabel : demoState.analysisRuns[idx].modelLabel,
        updatedAt: now,
      };
      demoState.analysisRuns[idx] = updated;
      return ok({ ...updated });
    },
    async appendSummary(id: string, _userId: string, summary: Record<string, unknown>): Promise<RepositoryResult<AnalysisRun>> {
      const idx = demoState.analysisRuns.findIndex((r) => r.id === id);
      if (idx < 0) return err('Run not found', RepositoryErrorCode.NOT_FOUND);
      demoState.analysisRuns[idx] = { ...demoState.analysisRuns[idx], summary, updatedAt: new Date().toISOString() };
      return ok({ ...demoState.analysisRuns[idx] });
    },
    async listByUser(userId: string, limit: number): Promise<RepositoryResult<AnalysisRun[]>> {
      return ok(demoState.analysisRuns.filter((r) => r.userId === userId).slice(0, limit).map((r) => ({ ...r })));
    },
    async listBySource(sourceId: string, _userId: string): Promise<RepositoryResult<AnalysisRun[]>> {
      return ok(demoState.analysisRuns.filter((r) => r.sourceId === sourceId).map((r) => ({ ...r })));
    },
    async listByLanguage(languageCode: string, _userId: string, runType: AnalysisRunType): Promise<RepositoryResult<AnalysisRun[]>> {
      return ok(
        demoState.analysisRuns
          .filter((r) => r.targetLanguageCode === languageCode && r.runType === runType)
          .map((r) => ({ ...r })),
      );
    },
    async deleteRunAndProposals(id: string, _userId: string): Promise<RepositoryResult<void>> {
      demoState.analysisEvents = demoState.analysisEvents.filter((e) => e.runId !== id);
      demoState.analysisProposals = demoState.analysisProposals.filter((p) => p.runId !== id);
      demoState.analysisRuns = demoState.analysisRuns.filter((r) => r.id !== id);
      return ok(undefined);
    },
  },

  analysisEvent: {
    async appendBatch(input: AppendBatchInput): Promise<RepositoryResult<AnalysisEvent[]>> {
      const created = input.events.map((e) => ({
        id: genId(),
        userId: input.userId,
        runId: input.runId,
        ordinal: e.ordinal,
        severity: e.severity,
        stage: e.stage ?? null,
        message: e.message.slice(0, 500),
        payload: e.payload ?? null,
        createdAt: new Date().toISOString(),
      }));
      demoState.analysisEvents.push(...created);
      return ok(created.map((e) => ({ ...e })));
    },
    async findByRun(runId: string, _userId: string): Promise<RepositoryResult<AnalysisEvent[]>> {
      return ok(demoState.analysisEvents.filter((e) => e.runId === runId).map((e) => ({ ...e })));
    },
    async findByRunSince(runId: string, _userId: string, sinceOrdinal: number): Promise<RepositoryResult<AnalysisEvent[]>> {
      return ok(
        demoState.analysisEvents
          .filter((e) => e.runId === runId && e.ordinal > sinceOrdinal)
          .map((e) => ({ ...e })),
      );
    },
  },

  analysisProposal: {
    async createBatch(input: CreateBatchInput): Promise<RepositoryResult<AnalysisProposal[]>> {
      const now = new Date().toISOString();
      const created: AnalysisProposal[] = input.proposals.map((p) => ({
        id: genId(),
        userId: input.userId,
        runId: input.runId,
        proposalKind: p.proposalKind,
        ordinal: p.ordinal,
        reviewStatus: 'pending' as ReviewStatus,
        payload: p.payload,
        editedPayload: null,
        reviewerNote: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      }));
      demoState.analysisProposals.push(...created);
      return ok(created.map((p) => ({ ...p })));
    },
    async findByRun(runId: string, _userId: string): Promise<RepositoryResult<AnalysisProposal[]>> {
      return ok(demoState.analysisProposals.filter((p) => p.runId === runId).map((p) => ({ ...p })));
    },
    async findById(id: string, _userId: string): Promise<RepositoryResult<AnalysisProposal | null>> {
      const found = demoState.analysisProposals.find((p) => p.id === id) ?? null;
      return ok(found ? { ...found } : null);
    },
    async findByRunAndKind(runId: string, _userId: string, kind: AnalysisProposalKind): Promise<RepositoryResult<AnalysisProposal[]>> {
      return ok(
        demoState.analysisProposals
          .filter((p) => p.runId === runId && p.proposalKind === kind)
          .map((p) => ({ ...p })),
      );
    },
    async updateReviewStatus(
      id: string,
      _userId: string,
      patch: {
        reviewStatus: ReviewStatus;
        reviewerNote?: string | null;
        editedPayload?: Record<string, unknown> | null;
      },
    ): Promise<RepositoryResult<AnalysisProposal>> {
      const idx = demoState.analysisProposals.findIndex((p) => p.id === id);
      if (idx < 0) return err('Proposal not found', RepositoryErrorCode.NOT_FOUND);
      demoState.analysisProposals[idx] = {
        ...demoState.analysisProposals[idx],
        reviewStatus: patch.reviewStatus,
        reviewerNote: patch.reviewerNote !== undefined ? patch.reviewerNote : demoState.analysisProposals[idx].reviewerNote,
        editedPayload: patch.editedPayload !== undefined ? patch.editedPayload : demoState.analysisProposals[idx].editedPayload,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return ok({ ...demoState.analysisProposals[idx] });
    },
  },

  lexicalSense: {
    async findByLemma(lemmaId: string, _userId: string): Promise<RepositoryResult<LexicalSense[]>> {
      return ok(demoState.lexicalSenses.filter((s) => s.lemmaId === lemmaId).map((s) => ({ ...s })));
    },
    async create(input: CreateLexicalSenseInput): Promise<RepositoryResult<LexicalSense>> {
      const now = new Date().toISOString();
      const sense: LexicalSense = {
        id: genId(),
        userId: input.userId,
        lemmaId: input.lemmaId,
        senseKind: input.senseKind,
        gloss: input.gloss,
        definitionTargetLanguage: input.definitionTargetLanguage ?? 'en',
        exampleText: input.exampleText ?? null,
        confidence: input.confidence ?? null,
        evidenceProvenance: (input.evidenceProvenance ?? 'generated_analysis') as EvidenceProvenance,
        sourceRunId: input.sourceRunId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      demoState.lexicalSenses.push(sense);
      return ok({ ...sense });
    },
    async delete(id: string, _userId: string): Promise<RepositoryResult<void>> {
      demoState.lexicalSenses = demoState.lexicalSenses.filter((s) => s.id !== id);
      return ok(undefined);
    },
  },

  grammarPattern: {
    async findBySource(sourceId: string, _userId: string): Promise<RepositoryResult<GrammarPattern[]>> {
      return ok(demoState.grammarPatterns.filter((p) => p.sourceId === sourceId).map((p) => ({ ...p })));
    },
    async create(input: CreateGrammarPatternInput): Promise<RepositoryResult<GrammarPattern>> {
      const now = new Date().toISOString();
      const pattern: GrammarPattern = {
        id: genId(),
        userId: input.userId,
        sourceId: input.sourceId ?? null,
        sourceSectionId: input.sourceSectionId ?? null,
        sourceSegmentId: input.sourceSegmentId ?? null,
        targetCoreConceptId: input.targetCoreConceptId ?? null,
        targetLemmaId: input.targetLemmaId ?? null,
        patternCode: input.patternCode,
        patternLabel: input.patternLabel,
        explanation: input.explanation ?? null,
        exampleSourceText: input.exampleSourceText ?? null,
        exampleTargetText: input.exampleTargetText ?? null,
        confidence: input.confidence ?? null,
        evidenceProvenance: (input.evidenceProvenance ?? 'generated_analysis') as EvidenceProvenance,
        sourceRunId: input.sourceRunId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      demoState.grammarPatterns.push(pattern);
      return ok({ ...pattern });
    },
    async delete(id: string, _userId: string): Promise<RepositoryResult<void>> {
      demoState.grammarPatterns = demoState.grammarPatterns.filter((p) => p.id !== id);
      return ok(undefined);
    },
  },

  lemmaConceptLink: {
    async findByLemma(lemmaId: string, _userId: string): Promise<RepositoryResult<LemmaConceptLink[]>> {
      return ok(demoState.lemmaConceptLinks.filter((l) => l.lemmaId === lemmaId).map((l) => ({ ...l })));
    },
    async upsert(input: UpsertLemmaConceptLinkInput): Promise<RepositoryResult<LemmaConceptLink>> {
      const idx = demoState.lemmaConceptLinks.findIndex(
        (l) => l.lemmaId === input.lemmaId && l.coreConceptId === input.coreConceptId,
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        demoState.lemmaConceptLinks[idx] = {
          ...demoState.lemmaConceptLinks[idx],
          realizationNote: input.realizationNote ?? null,
          confidence: input.confidence ?? null,
          evidenceProvenance: (input.evidenceProvenance ?? 'generated_analysis') as EvidenceProvenance,
          updatedAt: now,
        };
        return ok({ ...demoState.lemmaConceptLinks[idx] });
      }
      const link: LemmaConceptLink = {
        id: genId(),
        userId: input.userId,
        lemmaId: input.lemmaId,
        coreConceptId: input.coreConceptId,
        realizationNote: input.realizationNote ?? null,
        confidence: input.confidence ?? null,
        evidenceProvenance: (input.evidenceProvenance ?? 'generated_analysis') as EvidenceProvenance,
        sourceRunId: input.sourceRunId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      demoState.lemmaConceptLinks.push(link);
      return ok({ ...link });
    },
    async delete(id: string, _userId: string): Promise<RepositoryResult<void>> {
      demoState.lemmaConceptLinks = demoState.lemmaConceptLinks.filter((l) => l.id !== id);
      return ok(undefined);
    },
  },

  review: {
    async findStateByCard(cardId: string, _userId: string): Promise<RepositoryResult<ReviewState | null>> {
      const found = demoState.reviewStates.find((r) => r.cardId === cardId) ?? null;
      return ok(found ? { ...found } : null);
    },
    async upsertState(cardId: string, _userId: string, patch: Partial<ReviewState>): Promise<RepositoryResult<ReviewState>> {
      const idx = demoState.reviewStates.findIndex((r) => r.cardId === cardId);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated = { ...demoState.reviewStates[idx], ...patch, cardId, updatedAt: now } as ReviewState;
        demoState.reviewStates[idx] = updated;
        return ok({ ...updated });
      }
      const fresh: ReviewState = {
        cardId,
        cardStatus: patch.cardStatus ?? 'new',
        dueAt: patch.dueAt ?? null,
        intervalDays: patch.intervalDays ?? null,
        easeFactor: patch.easeFactor ?? null,
        repetitions: patch.repetitions ?? 0,
        lapses: patch.lapses ?? 0,
        lastReviewedAt: patch.lastReviewedAt ?? null,
        updatedAt: now,
      };
      demoState.reviewStates.push(fresh);
      return ok({ ...fresh });
    },
    async recordAttempt(userId: string, input: RecordReviewAttemptDTO): Promise<RepositoryResult<{ attempt: ReviewAttempt; state: ReviewState }>> {
      const { cardId, rating, timeSpentMs } = input;
      const now = new Date().toISOString();
      const isAgain = rating === 'again';
      const isHard = rating === 'hard';
      const isGood = rating === 'good';
      const nextStatus = isAgain || isHard ? 'learning' : 'review';
      const nextInterval = isGood ? 1 : isAgain || isHard ? 0 : 3;
      const nextEase = isAgain ? 2.3 : 2.5;
      const nextDue = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      const idx = demoState.reviewStates.findIndex((r) => r.cardId === cardId);
      const prev = idx >= 0 ? demoState.reviewStates[idx] : null;
      const nextReps = (prev?.repetitions ?? 0) + (isAgain ? 0 : 1);
      const nextLapses = (prev?.lapses ?? 0) + (isAgain ? 1 : 0);
      const updated: ReviewState = {
        cardId,
        cardStatus: nextStatus as ReviewState['cardStatus'],
        dueAt: nextDue,
        intervalDays: nextInterval,
        easeFactor: nextEase,
        repetitions: nextReps,
        lapses: nextLapses,
        lastReviewedAt: now,
        updatedAt: now,
      };
      if (idx >= 0) demoState.reviewStates[idx] = updated;
      else demoState.reviewStates.push(updated);
      return ok({
        attempt: {
          id: genId(),
          userId,
          cardId,
          rating,
          reviewedAt: now,
          timeSpentMs: timeSpentMs ?? null,
        },
        state: { ...updated },
      });
    },
  },

  coreConcept: {
    async findAll(_userId: string): Promise<RepositoryResult<CoreConcept[]>> {
      return ok(demoCoreConcepts.map((c) => ({ ...c })));
    },
    async findRealizations(_conceptId: string, _languageCode: string, _userId: string): Promise<RepositoryResult<ConceptRealization[]>> {
      // Demo has no seeded realizations — the UI renders the "no realizations
      // yet" state, which is the correct shape for a fresh environment.
      return ok([]);
    },
    async findLearnerProgress(userId: string, languageCode: string): Promise<RepositoryResult<LearnerConceptProgress[]>> {
      return ok(
        demoConceptProgress
          .filter((p) => p.userId === userId && p.languageCode === languageCode)
          .map((p) => ({ ...p })),
      );
    },
  },
};

/** Reset the demo adapter's in-session state back to the seed fixtures. Useful for /dev/knowalong. */
export function resetDemoState(): void {
  demoState.sources = [{ ...demoSource }];
  demoState.sections = demoSections.map((s) => ({ ...s }));
  demoState.lines = demoLines.map((l) => ({ ...l }));
  demoState.lemmas = demoLemmas.map((m) => ({ ...m }));
  demoState.forms = demoForms.map((f) => ({ ...f }));
  demoState.cards = demoCards.map((c) => ({ ...c }));
  demoState.reviewStates = demoReviewStates.map((r) => ({ ...r }));
  demoState.segments = [];
  demoState.lineSegmentLinks = [];
  demoState.analysisRuns = [];
  demoState.analysisEvents = [];
  demoState.analysisProposals = [];
  demoState.lexicalSenses = [];
  demoState.grammarPatterns = [];
  demoState.lemmaConceptLinks = [];
}

/** Expose the demo user id + source id for the /dev/knowalong showcase. */
export { DEMO_SOURCE_ID, DEMO_USER_ID };
