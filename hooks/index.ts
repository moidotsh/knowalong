// hooks/index.ts
// Barrel export for hooks. Cross-folder imports go through here
// (`@hooks/...`). Domain hooks (useWorkouts, etc.) are added by consumers.

export { usePlatformAnimation } from './usePlatformAnimation';
export type { UsePlatformAnimationReturn } from './usePlatformAnimation';
export { useReducedMotion, checkReducedMotionPreference, default as useAnimation } from './useAnimation';
export { useFadeSlide } from './useFadeSlide';
export type { UseFadeSlideOptions, UseFadeSlideReturn } from './useFadeSlide';
export { useControlledShake } from './useControlledShake';
export type { UseControlledShakeOptions, UseControlledShakeReturn } from './useControlledShake';
export { useAndroidChromeBlurFix } from './useAndroidChromeBlurFix';
export type { UseAndroidChromeBlurFixReturn } from './useAndroidChromeBlurFix';
export { useMounted } from './useMounted';
export { usePrevious } from './usePrevious';
export { usePwaPrompt } from './usePwaPrompt';
export type { UsePwaPromptResult, PwaPlatform } from './usePwaPrompt';
export { useAnimatedCounter } from './useAnimatedCounter';
export {
  useFadeIn,
  useFadeOut,
  useFadeToggle,
} from './useFadeAnimation';
export type {
  FadeAnimationOptions,
  UseFadeInReturn,
  UseFadeOutReturn,
  UseFadeToggleOptions,
  UseFadeToggleReturn,
} from './useFadeAnimation';
export {
  useScaleIn,
  useScaleOut,
  useScalePress,
  usePopIn,
} from './useScaleAnimation';
export type {
  ScaleAnimationOptions,
  UseScaleInReturn,
  UseScaleOutReturn,
  UseScalePressOptions,
  UseScalePressReturn,
  UsePopInOptions,
  UsePopInReturn,
} from './useScaleAnimation';
export { useContainerQuery, useContainerMeasure } from './useContainerQuery';
export type { ContainerMeasurement } from './useContainerQuery';
export { useResponsive } from './useResponsive';
export type { UseResponsiveReturn } from './useResponsive';
export { useShake } from './useShakeAnimation';
export type { ShakeAnimationOptions, UseShakeReturn } from './useShakeAnimation';
export { useTranslateY, useTranslateX } from './useTranslateAnimation';
export type {
  TranslateAnimationOptions,
  UseTranslateYReturn,
  UseTranslateXReturn,
} from './useTranslateAnimation';
export {
  useContainerVariant,
  computeContainerVariant,
  DEFAULT_VARIANT_THRESHOLDS,
  VARIANT_PRESETS,
} from './useContainerVariant';
export type {
  ContainerVariant,
  VariantThresholds,
  VariantHeights,
  VariantConfig,
} from './useContainerVariant';
export { useAuthNavigation } from './useAuthNavigation';
export { useShimmer } from './useShimmer';
export type { UseShimmerOptions } from './useShimmer';
export { useActivityGridLayout, computeActivityGridLayout } from './useActivityGridLayout';
export type {
  ActivityGridLayout,
  ActivityGridLayoutInput,
  ActivityGridLayoutMode,
} from './useActivityGridLayout';
export { useCopyForAi } from './useCopyForAi';
export type { UseCopyForAiResult } from './useCopyForAi';

// KnowAlong domain queries + mutations
export {
  useCurrentUserId,
  useLearningSources,
  useLearningSource,
  useSourceSections,
  useSourceVocabulary,
  useReviewQueue,
  useLearnerConceptProgress,
  useSourceReadiness,
  useSectionReadiness,
  useCompanionHealth,
  useCompanionCapabilities,
  useCompanionCredential,
  type CompanionCredentialView,
  useAnalysisRun,
  useAnalysisRunEvents,
  useAnalysisProposals,
  useSourceAnalysisRuns,
  useClccRuns,
} from './queries';
export {
  useCreateLearningSource,
  useUpdateLearningSource,
  useArchiveLearningSource,
  useRecordReviewAttempt,
  useStartSourceAnalysis,
  useStartClccGeneration,
  useCancelAnalysisRun,
  type CancelAnalysisRunInput,
  useReviewProposal,
  useReviewProposalBatch,
  useSaveCompanionCredential,
  type SaveCompanionCredentialInput,
  useClearCompanionCredential,
  useDeleteAnalysisRun,
  type DeleteAnalysisRunInput,
} from './mutations';
// SSE lifecycle hook for live analysis-run progress.
export { useAnalysisRunEventStream } from './useAnalysisRunEventStream';
