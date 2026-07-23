// components/MobilePremium/index.ts
// Barrel for the MobilePremium kit. This is the canonical import site for
// premium mobile primitives: `import { MobileSurface, MobileHeader } from
// '@components/MobilePremium'`.

export { MobileAtmosphere } from './MobileAtmosphere';
export type { MobileAtmosphereProps, MobileAtmosphereSurface } from './MobileAtmosphere';

export { MobileSurface } from './MobileSurface';
export type { MobileSurfaceProps } from './MobileSurface';

export { MobileHeader } from './MobileHeader';
export type { MobileHeaderProps } from './MobileHeader';

export { MobileHomeHeader } from './MobileHomeHeader';
export type { MobileHomeHeaderProps } from './MobileHomeHeader';

export { MobileActionFooter } from './MobileActionFooter';
export type { MobileActionFooterProps } from './MobileActionFooter';

export { MobilePrimaryButton } from './MobilePrimaryButton';
export type { MobilePrimaryButtonProps } from './MobilePrimaryButton';

export { MobileInput } from './MobileInput';
export type { MobileInputProps } from './MobileInput';

export { MobileAlert } from './MobileAlert';
export type { MobileAlertProps, MobileAlertVariant } from './MobileAlert';

export { MobileSettingsRow } from './MobileSettingsRow';
export type { MobileSettingsRowProps } from './MobileSettingsRow';

export { MobileSectionEyebrow } from './MobileSectionEyebrow';
export type { MobileSectionEyebrowProps } from './MobileSectionEyebrow';

export { MobileStepper } from './MobileStepper';
export type { MobileStepperProps } from './MobileStepper';

export { MobileSelect } from './MobileSelect';
export type { MobileSelectProps, MobileSelectOption } from './MobileSelect';

export { MobileCheckboxItem } from './MobileCheckboxItem';
export type { MobileCheckboxItemProps } from './MobileCheckboxItem';

export { MobileSelectionList } from './MobileSelectionList';
export type {
  MobileSelectionListProps,
  MobileSelectionOption,
} from './MobileSelectionList';

export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, Segment } from './SegmentedControl';

export { FilterChip } from './FilterChip';
export type { FilterChipProps, FilterChipAccessibilityRole } from './FilterChip';

export { FilterChipGroup } from './FilterChipGroup';
export type { FilterChipGroupProps } from './FilterChipGroup';

export { DisclosureRow } from './DisclosureRow';
export type { DisclosureRowProps } from './DisclosureRow';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';

export { StatCard } from './StatCard';
export type { StatCardProps, StatCardVariant, StatCardSize } from './StatCard';

export { Avatar } from './Avatar';
export type {
  AvatarProps,
  AvatarSize,
  AvatarShape,
  AvatarPresence,
} from './Avatar';

export { SegmentedProgress } from './SegmentedProgress';
export type {
  SegmentedProgressProps,
  ProgressSegment,
} from './SegmentedProgress';

export { OfflineBanner } from './OfflineBanner';
export type { OfflineBannerProps, OfflineBannerVariant } from './OfflineBanner';

export { CarouselTutorial } from './CarouselTutorial';
export type { CarouselTutorialProps, TutorialSlide } from './CarouselTutorial';

export { Wizard } from './Wizard';
export type { WizardProps, WizardStep } from './Wizard';

export { ProgressRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';

export { MobileSheet } from './MobileSheet';
export type { MobileSheetProps } from './MobileSheet';

export { DatePickerField } from './DatePickerField';
export type { DatePickerFieldProps } from './DatePickerField';

export { CalendarGrid } from './CalendarGrid';
export type { CalendarGridProps } from './CalendarGrid';

export { RevealMask } from './RevealMask';
export type { RevealMaskProps, RevealMaskVariant } from './RevealMask';

export { MobileStepRail } from './MobileStepRail';
export type { MobileStepRailProps } from './MobileStepRail';

export { MobileDialog } from './MobileDialog';
export type { MobileDialogProps } from './MobileDialog';

export { MobileNavDrawer } from './MobileNavDrawer';
export type {
  MobileNavDrawerProps,
  MobileNavDrawerItem,
} from './MobileNavDrawer';

export { SkeletonBlock } from './SkeletonBlock';
export type { SkeletonBlockProps } from './SkeletonBlock';

export { ActivityGrid } from './ActivityGrid';
export type {
  ActivityGridProps,
  ActivityGridDatum,
  ActivityGridLevel,
  ActivityGridCell,
  ActivityGridLayoutMode,
} from './ActivityGrid';
export { ActivityGridPreview } from './ActivityGridPreview';

export { CopyForAiButton } from './CopyForAiButton';
export type { CopyForAiButtonProps } from './CopyForAiButton';

// Motion re-export (alias of components/premium/shared).
export * from './MobileMotion';

// NOTE: `showcase` is deliberately NOT re-exported from this barrel.
// It's a dev visualization, not a primitive, and re-exporting it here
// closes a four-step require cycle (primitives barrel → LoadingOverlay
// → this barrel → showcase → primitives barrel). The single consumer
// (`app/dev/premium.tsx`) imports showcase directly from
// `./components/MobilePremium/showcase`. See docs/contributing.md.
