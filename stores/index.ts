// stores/index.ts
// Barrel for cross-cutting Zustand stores + KnowAlong domain stores.

export { useAuthStore, type AuthStatus } from './authStore';
export { useUIStore } from './uiStore';
export {
  useNetworkStore,
  useIsOnline,
  getNetworkStatus,
  initializeNetworkListeners,
} from './networkStore';
export { zustandStorage } from './storage';
export { useImportDraftStore, type ImportStep } from './importDraftStore';
export { useSongShelfStore, type SongAspiration, type SongShelfState } from './songShelfStore';
export {
  useJourneyStore,
  JOURNEY_SCENARIOS,
  JOURNEY_CONTENT_REVISION,
  toSnapshot,
  type JourneyScenario,
  type LangProgress,
  type DraftItem,
  type JourneyPrefs,
  type OnboardingSource,
  type JourneyState,
} from './journeyStore';
