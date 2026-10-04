// utils/journey/index.ts
//
// Barrel for the journey fixture + derivation layer. Components import
// from 'utils/journey' (S5: cross-folder imports go through folder
// barrels), never from individual files here.

// Concept types
export type {
  StepStatus,
  StepKind,
  Journey,
  Chapter,
  JourneyStep,
  MediaKind,
  MediaAccess,
  PassageWord,
  PassageLine,
  Passage,
  MediaItem,
  SessionPlanKind,
  PhraseRevealActivity,
  MeaningChoiceActivity,
  BuilderChip,
  PhraseBuilderActivity,
  PassageReturnActivity,
  RecapActivity,
  SessionActivity,
  SessionPlan,
  EvidenceStatus,
  EvidenceRecord,
  PinnedSessionAnswer,
  PinnedSession,
} from './types';

// Media fixtures
export {
  MEDIA_ITEMS,
  MEDIA_ORDER,
  SAMPLE_IMPORT_TEXT,
  getMediaItem,
  mediaWordIndex,
  canonicalMediaForWord,
  getPassageWord,
  knownLineIndex,
} from './media';

// Curriculum fixtures
export {
  RU_JOURNEY,
  RU_JOURNEY_ID,
  CHAPTERS,
  getChapter,
  getStep,
  getChapterSteps,
} from './curriculum';

// Session plans + bounded review builder
export {
  SESSION_PLANS,
  REVIEW_SESSION_CAP,
  CITY_LIGHTS_SOURCE,
  NORTHERN_SOURCE,
  METRO_SOURCE,
  FOUNDATIONS_SOURCE,
  getSessionPlan,
  resolveSessionPlan,
  buildBoundedReviewPlan,
} from './sessions';

// Pure derivation over progress
export {
  todayStamp,
  addDaysStamp,
  isChapterLocked,
  isEvidenceDue,
  getStepStatus,
  getNextPlanForStep,
  canEnterSession,
  getDueReviewKeys,
  notebookLabel,
  projectNotebook,
  deriveJourneyView,
  getContinueAction,
  type JourneyProgressSnapshot,
  type NotebookLabel,
  type NotebookEntry,
  type StepView,
  type ChapterView,
  type JourneyView,
} from './selectors';
