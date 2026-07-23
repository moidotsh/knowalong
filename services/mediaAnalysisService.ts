// services/mediaAnalysisService.ts
// Typed future cloud-analysis contract. Out of scope for this checkpoint:
// actual LLM calls, API keys, prompt execution, Edge Functions. The
// default implementation (UnavailableMediaAnalysisService) returns a typed
// { status: 'unconfigured' } result so the UI can render the correct
// "analysis not available" state. A DemoMediaAnalysisService (used only
// when an explicit demo flag is set) returns the one-fixture analysis
// payload.

import type {
  MediaAnalysisRequest,
  MediaAnalysisResult,
  MediaAnalysisResponse,
} from '../shared/types/knowalong';
import { demoAnalysisFixture } from '../shared/fixtures';
import { DEMO_SOURCE_ID } from '../utils/supabase/repositories';

export interface MediaAnalysisService {
  analyze(request: MediaAnalysisRequest): Promise<MediaAnalysisResult>;
}

/**
 * Default implementation. Analysis is not configured — returns a typed
 * unconfigured result so the UI can render the correct state.
 */
class UnavailableMediaAnalysisService implements MediaAnalysisService {
  async analyze(_request: MediaAnalysisRequest): Promise<MediaAnalysisResult> {
    return { status: 'unconfigured' };
  }
}

/**
 * Demo implementation. Returns the one-fixture analysis payload (the demo
 * Russian source). Used only when an explicit demo flag is set (e.g. the
 * /dev/knowalong showcase).
 */
class DemoMediaAnalysisService implements MediaAnalysisService {
  async analyze(request: MediaAnalysisRequest): Promise<MediaAnalysisResult> {
    // The demo fixture only covers DEMO_SOURCE_ID; for any other source,
    // return unconfigured so the UI shows the "not available" state.
    if (request.sourceId !== DEMO_SOURCE_ID) {
      return { status: 'unconfigured' };
    }
    const response: MediaAnalysisResponse = {
      sourceId: request.sourceId,
      sections: demoAnalysisFixture.sections.map((s) => ({
        ordinal: s.ordinal,
        sectionType: s.sectionType,
        label: s.label,
        lineOrdinals: demoAnalysisFixture.lines
          .filter((l) => l.sectionId === s.id)
          .map((l) => l.ordinal),
      })),
      lines: demoAnalysisFixture.lines.map((l) => ({
        ordinal: l.ordinal,
        sectionOrdinal: l.sectionId
          ? demoAnalysisFixture.sections.find((s) => s.id === l.sectionId)?.ordinal ?? null
          : null,
        rawText: l.rawText,
        normalizedText: l.normalizedText,
        translation: l.translation,
        transliteration: l.transliteration,
        suggestedReviewStatus: l.reviewStatus,
      })),
      tokens: demoAnalysisFixture.tokens.map((t) => ({
        lineOrdinal: demoAnalysisFixture.lines.find((l) => l.id === t.sourceLineId)?.ordinal ?? 0,
        ordinal: t.ordinal,
        surfaceToken: t.surfaceToken,
        charStart: t.charStart,
        charEnd: t.charEnd,
        lemmaIndex: demoAnalysisFixture.lemmas.findIndex((m) =>
          demoAnalysisFixture.forms.some((f) => f.id === t.lexicalFormId && f.lemmaId === m.id),
        ),
        formIndex: demoAnalysisFixture.forms.findIndex((f) => f.id === t.lexicalFormId),
      })),
      lemmas: demoAnalysisFixture.lemmas.map((m) => ({
        normalizedLemma: m.normalizedLemma,
        partOfSpeech: m.partOfSpeech,
        primaryGloss: m.primaryGloss,
        languageCode: m.languageCode,
        grammaticalGender: m.grammaticalGender,
        animacy: m.animacy,
        verbAspect: m.verbAspect,
        formIndices: demoAnalysisFixture.forms
          .map((f, i) => (f.lemmaId === m.id ? i : -1))
          .filter((i) => i >= 0),
      })),
      forms: demoAnalysisFixture.forms.map((f) => ({
        surfaceForm: f.surfaceForm,
        morphologySummary: f.morphologySummary,
        grammaticalCase: f.grammaticalCase,
        grammaticalNumber: f.grammaticalNumber,
        grammaticalPerson: f.grammaticalPerson,
        tense: f.tense,
        lemmaIndex: demoAnalysisFixture.lemmas.findIndex((m) => m.id === f.lemmaId),
      })),
      cards: [],
      transfers: [],
      concepts: [],
      warnings: [],
    };
    return { status: 'success', response };
  }
}

/**
 * The active media analysis service. Ships as the Unavailable implementation
 * (no LLM configured). The /dev/knowalong showcase may swap to the Demo
 * implementation for visualization.
 */
export const mediaAnalysisService: MediaAnalysisService = new UnavailableMediaAnalysisService();

/** Construct a demo-only analysis service for the /dev/knowalong showcase. */
export function createDemoMediaAnalysisService(): MediaAnalysisService {
  return new DemoMediaAnalysisService();
}
