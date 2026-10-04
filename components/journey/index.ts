// components/journey/index.ts
//
// Barrel for the learner-journey component kit. Screens import from
// 'components/journey' (S5: cross-folder imports go through barrels).

export { JOURNEY_LAYOUT, JOURNEY_MOTION, JOURNEY_TYPE, LABEL_TRACKING, MILESTONE_VISUALS } from './tokens';
export type { MilestoneVisual } from './tokens';

export { DuskArtworkVector } from './DuskArtworkVector';
export type { DuskArtworkKey } from './DuskArtworkVector';

export { PrimaryNav } from './PrimaryNav';
export type { PrimaryDestination, PrimaryNavProps } from './PrimaryNav';

export { JourneyScaffold } from './JourneyScaffold';
export type { JourneyScaffoldProps } from './JourneyScaffold';

export { ChapterHeader, JourneyRail, MilestoneRow } from './JourneyRail';

export { CurrentStepPanel } from './CurrentStepPanel';
export type { CurrentStepPanelProps } from './CurrentStepPanel';

export { ReviewOffer } from './ReviewOffer';
export type { ReviewOfferProps } from './ReviewOffer';

export { ChapterPreview } from './ChapterPreview';
export type { ChapterPreviewProps } from './ChapterPreview';

export { SessionShell } from './session/SessionShell';
export type { SessionShellProps } from './session/SessionShell';

export {
  MeaningChoiceCard,
  PassageReturnCard,
  PhraseBuilderCard,
  PhraseRevealCard,
  RecapCard,
} from './session/ActivityCards';
export type { MeaningChoiceCardProps, PhraseBuilderCardProps } from './session/ActivityCards';

export { HelpPanel } from './session/HelpPanel';
export type { HelpPanelProps } from './session/HelpPanel';

export { PassageReader, WordSheet } from './reader/PassageReader';
export type { PassageReaderProps } from './reader/PassageReader';
