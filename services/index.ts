// services/index.ts
// Barrel for the services layer. Shell-level queue services + KnowAlong
// domain services (sources, readiness, review, analysis, transfer policy,
// local-companion orchestration, proposal review).

export { BaseQueueService } from './base';
export {
  OfflineQueueService,
  type QueueItem,
  type QueueItemStatus,
  type SyncResult,
} from './offlineQueueService';
export { learningSourceService } from './learningSourceService';
export { readinessService } from './readinessService';
export { reviewService, type SubmitReviewResult } from './reviewService';
export {
  mediaAnalysisService,
  createDemoMediaAnalysisService,
  type MediaAnalysisService,
} from './mediaAnalysisService';
export {
  validateTransferCardProposal,
  type TransferValidationResult,
} from './transferPolicyService';
export { companionClientService } from './companionClientService';
export {
  localAnalysisService,
  type StartSourceAnalysisInput,
  type StartSourceAnalysisOutcome,
} from './localAnalysisService';
export {
  clccGenerationService,
  type StartClccGenerationInput,
  type StartClccGenerationOutcome,
} from './clccGenerationService';
export { proposalReviewService } from './proposalReviewService';
