// components/MobilePremium/index.ts
// Barrel for the MobilePremium kit. This is the canonical import site for
// premium mobile primitives: `import { MobileSurface, MobileHeader } from
// '@components/MobilePremium'`.

export { MobileAtmosphere } from './MobileAtmosphere';
export { InkPanel } from './InkPanel';
export { inkSurface, INK_GRAIN_BACKGROUND } from './grain';
export { RouteCurtain } from './RouteCurtain';
export { LangToggle } from './LangToggle';
export type { LangToggleProps } from './LangToggle';
export {
  AbsorbProvider,
  AbsorbTopBar,
  AbsorbSpacer,
  AbsorbStation,
  AbsorbChromeNeutral,
  useAbsorbFg,
  useAbsorbBar,
  compositeWash,
  dimmedOver,
} from './MobileAbsorbBar';
export type { AbsorbFillLayer, AbsorbTone } from './MobileAbsorbBar';
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

export { CheckBox } from './CheckBox';
export type { CheckBoxProps } from './CheckBox';
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
export { SearchField } from './SearchField';
export type { SearchFieldProps } from './SearchField';
export type { FilterChipGroupProps } from './FilterChipGroup';

export { DisclosureRow } from './DisclosureRow';
export type { DisclosureRowProps } from './DisclosureRow';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateAction } from './EmptyState';

export { Figure } from './Figure';
export { TallyStrip } from './TallyStrip';
export type { TallyStripProps, TallySize } from './TallyStrip';
export type { FigureProps, FigureSize, FigureTone, FigureAlign } from './Figure';

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

export { MobileAnnouncementBar } from './MobileAnnouncementBar';
export type { MobileAnnouncementBarProps } from './MobileAnnouncementBar';

export { MobileFootnote } from './MobileFootnote';
export type { MobileFootnoteProps } from './MobileFootnote';

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
export { NAV_DRAWER_WIDTH } from './MobileNavDrawer';
export type {
  MobileNavDrawerProps,
  MobileNavDrawerItem,
  NavDrawerAnchor,
  NavDrawerBrandPersistence,
} from './MobileNavDrawer';

export { MobileNavDrawerGlassCap } from './MobileNavDrawerGlassCap';
export type { MobileNavDrawerGlassCapProps } from './MobileNavDrawerGlassCap';

export { HamburgerButton } from './HamburgerButton';

export { MobileTabBar } from './MobileTabBar';
export type {
  MobileTabBarProps,
  MobileTabBarItem,
  MobileTabBarCenterAction,
} from './MobileTabBar';
export type { HamburgerButtonProps } from './HamburgerButton';

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

// Motion re-export — the canonical source is components/premium/shared
// (the kit-internals layer); the kit barrel carries the same surface so
// consumers import motion and primitives from one place.
export {
  FadeIn,
  Crossfade,
  usePressedStyle,
  useFocusRing,
  pressStyle,
  RESPOND_PRESSED,
  prefersReducedMotionSync,
  useReducedMotion,
  Pressable,
} from '../premium/shared';
export type {
  FadeInProps,
  CrossfadeProps,
  UseFocusRingOptions,
} from '../premium/shared';

// NOTE: nothing inside `showcase/` is re-exported from this barrel.
// The showcase is a dev visualization, not a primitive, and re-exporting
// it here closes a four-step require cycle (primitives barrel →
// LoadingOverlay → this barrel → showcase → primitives barrel) that
// Metro warns about. The single consumer (`app/dev/premium.tsx`)
// imports directly from `./components/MobilePremium/showcase` (the
// folder's index). See docs/contributing.md.
