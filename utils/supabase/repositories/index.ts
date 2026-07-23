// utils/supabase/repositories/index.ts
// Barrel for the repository pattern. The shell-level helpers (types.ts)
// are domain-agnostic; the KnowAlong concrete repositories (learningSource,
// sourceSection, vocabulary, studyCard, review, coreConcept) are consumer-
// owned and delegate to the demo adapter when Supabase is not configured.
// The audit gate (S9) treats this folder as the single legitimate home for
// direct `supabase.*` calls.

export {
  type RepositoryResult,
  RepositoryError,
  RepositoryErrorCode,
  ok,
  err,
  validateWithSchema,
  classifySupabaseError,
  handleRepositoryError,
  unauthorized,
  throwIfFailed,
} from './types';

export { DEMO_MODE } from './demoMode';
export { learningSourceRepository } from './learningSourceRepository';
export { sourceSectionRepository } from './sourceSectionRepository';
export { vocabularyRepository } from './vocabularyRepository';
export { studyCardRepository } from './studyCardRepository';
export { reviewRepository } from './reviewRepository';
export { coreConceptRepository } from './coreConceptRepository';
export { sourceSegmentRepository } from './sourceSegmentRepository';
export { analysisRunRepository } from './analysisRunRepository';
export { analysisEventRepository } from './analysisEventRepository';
export { analysisProposalRepository } from './analysisProposalRepository';
export { lexicalSenseRepository } from './lexicalSenseRepository';
export { grammarPatternRepository } from './grammarPatternRepository';
export { lemmaConceptLinkRepository } from './lemmaConceptLinkRepository';
export { demoAdapter, resetDemoState, DEMO_SOURCE_ID, DEMO_USER_ID } from './demoAdapter';
