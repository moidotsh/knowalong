// shared/types/knowalong/analysis.ts
// Typed future cloud-analysis contract. Pure types — no implementation.
// When LLM integration is wired, a service implementing this contract will
// accept a MediaAnalysisRequest (the user's pasted source text + metadata)
// and return a MediaAnalysisResponse (parsed sections, lines, tokens,
// lemmas, forms, morphology, card proposals, transfer proposals, and
// concept candidates).
//
// Out of scope for this checkpoint: any actual LLM calls, API keys, prompt
// execution, or Edge Functions. This file exists so the UI can render a
// typed "analysis unavailable / not configured" state today and so the
// future implementation has a stable contract to fill in.

import type {
  SectionType,
  LineReviewStatus,
  CardKind,
  RealizationType,
  SegmentKind,
  SenseKind,
  EvidenceProvenance,
} from './enums';
import type { DifficultyBudget } from './difficultyBudget';

/** Input to a future cloud analysis run. */
export interface MediaAnalysisRequest {
  sourceId: string;
  sourceType: 'lyrics';
  targetLanguage: string;
  translationLanguage: string;
  /** Raw user-pasted text. */
  rawText: string;
  /** Optional metadata hints (title/artist already provided by user). */
  hints?: {
    title?: string;
    artist?: string;
  };
}

/** A parsed section proposal (verse, chorus, …). */
export interface AnalysisSectionProposal {
  ordinal: number;
  sectionType: SectionType;
  label: string | null;
  /** Indices into the AnalysisLineProposal[] array that belong to this section. */
  lineOrdinals: number[];
}

/** A parsed line proposal with optional derivatives. */
export interface AnalysisLineProposal {
  ordinal: number;
  sectionOrdinal: number | null;
  rawText: string;
  normalizedText: string | null;
  translation: string | null;
  transliteration: string | null;
  suggestedReviewStatus: LineReviewStatus;
}

/** A token observed in a line, optionally resolved to a lemma/form. */
export interface AnalysisTokenProposal {
  lineOrdinal: number;
  ordinal: number;
  surfaceToken: string;
  charStart: number | null;
  charEnd: number | null;
  /** Reference into the lemma proposal array when resolved. */
  lemmaIndex: number | null;
  /** Reference into the form proposal array when resolved. */
  formIndex: number | null;
}

/** Proposed lemma with optional grammar metadata. */
export interface AnalysisLemmaProposal {
  normalizedLemma: string;
  partOfSpeech: string;
  primaryGloss: string | null;
  languageCode: string;
  grammaticalGender: string | null;
  animacy: string | null;
  verbAspect: string | null;
  /** Indices into the form proposal array that belong to this lemma. */
  formIndices: number[];
}

/** Proposed inflected form with morphology summary. */
export interface AnalysisFormProposal {
  surfaceForm: string;
  morphologySummary: string | null;
  grammaticalCase: string | null;
  grammaticalNumber: string | null;
  grammaticalPerson: string | null;
  tense: string | null;
  /** Index into the lemma proposal array that owns this form. */
  lemmaIndex: number;
}

/** A proposed source-derived study card. */
export interface AnalysisCardProposal {
  cardKind: CardKind;
  sourceLineOrdinal: number;
  prompt: string;
  answer: string;
  contextNote: string | null;
  /** Optional lemma target (for lemma-recognition cards). */
  lemmaIndex: number | null;
}

/** A proposed generated-transfer card (practice that targets a concept). */
export interface AnalysisTransferProposal {
  targetCoreConceptCode: string;
  targetLemmaIndex: number | null;
  prompt: string;
  answer: string;
  contextNote: string | null;
}

/** A concept candidate observed in the source (for learner_concept_progress evidence). */
export interface AnalysisConceptCandidate {
  coreConceptCode: string;
  languageCode: string;
  realizationType: RealizationType;
  surfaceForm: string;
  gloss: string | null;
  /** Line ordinals where this candidate was observed. */
  lineOrdinals: number[];
}

/** Non-fatal warning surfaced by analysis (low confidence, ambiguous parse, etc.). */
export interface AnalysisWarning {
  code: 'low_confidence' | 'ambiguous_parse' | 'unsupported_language' | 'rate_limited' | 'partial';
  message: string;
  /** Optional line ordinal the warning applies to. */
  lineOrdinal: number | null;
}

/** Full analysis response. All arrays are indexed by the proposal's ordinal/index fields. */
export interface MediaAnalysisResponse {
  sourceId: string;
  sections: AnalysisSectionProposal[];
  lines: AnalysisLineProposal[];
  tokens: AnalysisTokenProposal[];
  lemmas: AnalysisLemmaProposal[];
  forms: AnalysisFormProposal[];
  cards: AnalysisCardProposal[];
  transfers: AnalysisTransferProposal[];
  concepts: AnalysisConceptCandidate[];
  warnings: AnalysisWarning[];
}

/** Discriminated union for the service result. */
export type MediaAnalysisResult =
  | { status: 'success'; response: MediaAnalysisResponse }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string };

// ── Per-kind proposal payloads (migrations 007, 008, 009) ──────────────
//
// Each proposal_kind in analysis_proposals carries a typed payload. These
// are the wire/domain shapes the PWA persists into the `payload` jsonb
// column and the proposalReviewService reads when applying the acceptance
// matrix. See _reports/local-analysis-clcc.md for the full matrix.

/** Payload for proposal_kind = 'section'. Lands in source_sections on accept. */
export interface SectionProposalPayload {
  sourceId: string;
  ordinal: number;
  sectionType: SectionType;
  label: string | null;
  /** Source-line ordinals that belong to this section. */
  lineOrdinals: number[];
}

/** Payload for proposal_kind = 'segment'. Acceptance DEFERRED in this checkpoint. */
export interface SegmentProposalPayload {
  sourceId: string;
  ordinal: number;
  segmentKind: SegmentKind;
  label: string | null;
  /** Ordered per-line span links — the SOLE authoritative span representation. */
  lineSpan: Array<{
    sourceLineOrdinal: number;
    ordinal: number;
    startOffset: number | null;
    endOffset: number | null;
    lineFragment: string | null;
  }>;
  /** Deterministic reconstruction of the ordered lineSpan. */
  assembledDisplayText: string;
  /** sha256 of assembledDisplayText. */
  displayTextChecksum: string;
}

/** Payload for proposal_kind = 'line_translation'. Updates source_lines.translation on accept. */
export interface LineTranslationProposalPayload {
  sourceId: string;
  sourceLineId: string;
  translationText: string;
  translationLanguageCode: string;
}

/** Payload for proposal_kind = 'token_occurrence'. Acceptance DEFERRED. */
export interface TokenOccurrenceProposalPayload {
  sourceLineId: string;
  ordinal: number;
  surfaceToken: string;
  charStart: number | null;
  charEnd: number | null;
  /** Reference into a sibling lemma proposal (resolved at accept time). */
  lemmaProposalOrdinal: number | null;
}

/** Payload for proposal_kind = 'lemma'. Lands in lexical_lemmas on accept. */
export interface LemmaProposalPayload {
  languageCode: string;
  normalizedLemma: string;
  partOfSpeech: string;
  primaryGloss: string | null;
  grammaticalGender: string | null;
  animacy: string | null;
  verbAspect: string | null;
}

/** Payload for proposal_kind = 'form'. Lands in lexical_forms on accept (FORM proposals only — NOT a generated-card target). */
export interface FormProposalPayload {
  lemmaProposalOrdinal: number;
  surfaceForm: string;
  morphologySummary: string | null;
  grammaticalCase: string | null;
  grammaticalNumber: string | null;
  grammaticalPerson: string | null;
  tense: string | null;
}

/** Payload for proposal_kind = 'morphology'. Updates lexical_forms.morphology_summary on accept. */
export interface MorphologyProposalPayload {
  lexicalFormId: string;
  morphologySummary: string;
}

/** Payload for proposal_kind = 'grammar_pattern'. Lands in grammar_patterns on accept. */
export interface GrammarPatternProposalPayload {
  sourceId: string | null;
  sourceSectionId: string | null;
  sourceSegmentProposalOrdinal: number | null;
  targetCoreConceptCode: string | null;
  targetLemmaProposalOrdinal: number | null;
  patternCode: string;
  patternLabel: string;
  explanation: string | null;
  exampleSourceText: string | null;
  exampleTargetText: string | null;
  confidence: number | null;
  evidenceProvenance: EvidenceProvenance;
}

/** Payload for proposal_kind = 'concept_mapping'. Lands in lemma_concept_links on accept. */
export interface ConceptMappingProposalPayload {
  lemmaProposalOrdinal: number;
  coreConceptCode: string;
  realizationNote: string | null;
  confidence: number | null;
}

/**
 * Payload for proposal_kind = 'card'. Lands in study_cards on accept.
 * Generated-transfer cards target lemma / Core Concept / realization /
 * grammar_pattern ONLY (revision 3 correction I — form is NOT a target).
 * source_segment_id is context-only and does NOT satisfy the target
 * requirement.
 */
export interface CardProposalPayload {
  sourceId: string | null;
  sourceSectionId: string | null;
  sourceLineId: string | null;
  sourceSegmentProposalOrdinal: number | null;
  cardKind: CardKind;
  generatedContent: boolean;
  /** The four allowed generated-transfer targets (form intentionally absent). */
  lexicalLemmaProposalOrdinal?: number | null;
  targetCoreConceptCode?: string | null;
  targetRealizationProposalOrdinal?: number | null;
  grammarPatternProposalOrdinal?: number | null;
  prompt: string;
  answer: string;
  contextNote: string | null;
  difficultyBudget?: DifficultyBudget | null;
}

/** Payload for proposal_kind = 'realization'. Acceptance DEFERRED (CLCC promotion deferred). */
export interface RealizationProposalPayload {
  coreConceptCode: string;
  languageCode: 'fr' | 'ru' | 'fa';
  realizationType: RealizationType;
  surfaceForm: string;
  gloss: string | null;
  grammaticalNote: string | null;
  lemmaProposalOrdinal: number | null;
  senseKind: SenseKind;
}

/**
 * Discriminated union by `proposal_kind`. The proposalReviewService
 * narrows on `proposal_kind` to pick the matching payload shape and
 * dispatch to the per-kind acceptance path.
 */
export type AnalysisProposalPayload = {
  proposal_kind: 'section';
  payload: SectionProposalPayload;
} | {
  proposal_kind: 'segment';
  payload: SegmentProposalPayload;
} | {
  proposal_kind: 'line_translation';
  payload: LineTranslationProposalPayload;
} | {
  proposal_kind: 'token_occurrence';
  payload: TokenOccurrenceProposalPayload;
} | {
  proposal_kind: 'lemma';
  payload: LemmaProposalPayload;
} | {
  proposal_kind: 'form';
  payload: FormProposalPayload;
} | {
  proposal_kind: 'morphology';
  payload: MorphologyProposalPayload;
} | {
  proposal_kind: 'grammar_pattern';
  payload: GrammarPatternProposalPayload;
} | {
  proposal_kind: 'concept_mapping';
  payload: ConceptMappingProposalPayload;
} | {
  proposal_kind: 'card';
  payload: CardProposalPayload;
} | {
  proposal_kind: 'realization';
  payload: RealizationProposalPayload;
};
