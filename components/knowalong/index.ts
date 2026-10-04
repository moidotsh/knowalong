// components/knowalong/index.ts
// Barrel for KnowAlong composed domain components. Each component renders
// a piece of the local-analysis + CLCC workflow surfaced via app/source/[id]/analysis*,
// app/clcc*, and app/settings/companion.

export { CompanionStatusChip } from './CompanionStatusChip';
export { AnalysisProgressCard } from './AnalysisProgressCard';
export { AnalysisStageRail } from './AnalysisStageRail';
export { AnalysisEventTimeline } from './AnalysisEventTimeline';
export { ProposalCard } from './ProposalCard';
export { ProposalReviewBatch } from './ProposalReviewBatch';
export { ClccRealizationProposal } from './ClccRealizationProposal';

// NIGHT METRO — the design language's signature components.
export { Rollsign } from './Rollsign';
export { LineMap } from './LineMap';
export { StationRow } from './StationRow';
export { SongTabBar, type SongTabId } from './SongTabBar';
export {
  stationColor,
  stationTitleColor,
  STATION_STATES,
  type StationState,
} from './nightMetro';
export type { LineMapStation } from './LineMap';
