// lib/react-query/queryKeys.ts
// Centralized query-key factory. Shell-level cross-cutting keys (auth, user)
// plus KnowAlong domain keys (sources, sections, vocabulary, cards, review,
// concepts, readiness). Every hook MUST use this factory — audit S13 blocks
// inline `queryKey: [...]`.

export const queryKeys = {
  // Authentication
  auth: {
    session: () => ['auth', 'session'] as const,
    status: () => ['auth', 'status'] as const,
  },

  // Current user (profile, settings, etc. — whatever the consumer defines
  // as "the user"). Kept generic so the auth flow has a cache primitive to
  // invalidate on login/logout.
  user: {
    all: ['user'] as const,
    detail: (userId?: string) => [...queryKeys.user.all, 'detail', userId] as const,
  },

  // KnowAlong domain keys
  sources: {
    all: ['sources'] as const,
    list: () => [...queryKeys.sources.all, 'list'] as const,
    detail: (sourceId: string) => [...queryKeys.sources.all, 'detail', sourceId] as const,
  },
  sections: {
    all: ['sections'] as const,
    bySource: (sourceId: string) => [...queryKeys.sections.all, 'source', sourceId] as const,
    detail: (sourceId: string, sectionId: string) =>
      [...queryKeys.sections.all, 'detail', sourceId, sectionId] as const,
  },
  vocabulary: {
    all: ['vocabulary'] as const,
    bySource: (sourceId: string) => [...queryKeys.vocabulary.all, 'source', sourceId] as const,
    detail: (lemmaId: string) => [...queryKeys.vocabulary.all, 'detail', lemmaId] as const,
    sourceLines: (lemmaId: string) =>
      [...queryKeys.vocabulary.all, 'source-lines', lemmaId] as const,
  },
  cards: {
    all: ['cards'] as const,
    bySource: (sourceId: string) => [...queryKeys.cards.all, 'source', sourceId] as const,
    bySection: (sourceId: string, sectionId: string) =>
      [...queryKeys.cards.all, 'section', sourceId, sectionId] as const,
    generatedTransfer: (sourceId: string) =>
      [...queryKeys.cards.all, 'generated-transfer', sourceId] as const,
  },
  review: {
    all: ['review'] as const,
    queue: (limit?: number) => [...queryKeys.review.all, 'queue', limit] as const,
  },
  concepts: {
    all: ['concepts'] as const,
    list: () => [...queryKeys.concepts.all, 'list'] as const,
    realizations: (conceptId: string, languageCode: string) =>
      [...queryKeys.concepts.all, 'realizations', conceptId, languageCode] as const,
    learnerProgress: (languageCode: string) =>
      [...queryKeys.concepts.all, 'progress', languageCode] as const,
  },
  readiness: {
    all: ['readiness'] as const,
    source: (sourceId: string) => [...queryKeys.readiness.all, 'source', sourceId] as const,
    section: (sourceId: string, sectionId: string) =>
      [...queryKeys.readiness.all, 'section', sourceId, sectionId] as const,
  },

  // Local-companion + analysis/CLCC run keys (revision 3 checkpoint)
  companion: {
    all: ['companion'] as const,
    health: () => [...queryKeys.companion.all, 'health'] as const,
    capabilities: () => [...queryKeys.companion.all, 'capabilities'] as const,
    credential: () => [...queryKeys.companion.all, 'credential'] as const,
  },
  analysisRuns: {
    all: ['analysis-runs'] as const,
    detail: (runId: string) => [...queryKeys.analysisRuns.all, 'detail', runId] as const,
    events: (runId: string) => [...queryKeys.analysisRuns.all, 'events', runId] as const,
    proposals: (runId: string, filter?: string) =>
      [...queryKeys.analysisRuns.all, 'proposals', runId, filter] as const,
    bySource: (sourceId: string) =>
      [...queryKeys.analysisRuns.all, 'source', sourceId] as const,
    byUser: () => [...queryKeys.analysisRuns.all, 'user'] as const,
  },
  clcc: {
    all: ['clcc'] as const,
    byLanguage: (languageCode: string) =>
      [...queryKeys.clcc.all, 'language', languageCode] as const,
    detail: (runId: string) => [...queryKeys.clcc.all, 'detail', runId] as const,
  },
} as const;
