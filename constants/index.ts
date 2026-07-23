// constants/index.ts
// Barrel export for the constants module. The shell barrel is intentionally
// slim — domain constants (records, items, tips, etc.) land in consumer
// repos, not the shell.

export { theme } from './theme';
export type { ColorScheme, ColorPalette } from './theme';
export { DURATION, ANIMATION_CONFIG, RESIZE_MEASUREMENT_DEBOUNCE, ANIMATION } from './animation';
export {
  BREAKPOINTS,
  CONTAINER_THRESHOLDS,
  COMPONENT_THRESHOLDS,
  COMPONENT_VARIANT_THRESHOLDS,
  HEIGHT_THRESHOLDS,
  RESIZE_DEBOUNCE_MS,
  SPACING_BY_MODE,
  LAYOUT,
  getLayoutMode,
  getContainerSize,
  isContainerConstrained,
  isContainerShort,
  getComponentVariant,
  shouldUseDesktopStyle,
  getPreviewRowCount,
  shouldShowExpandedContent,
  canFitMultipleColumns,
} from './breakpoints';
export type {
  LayoutMode,
  ContainerSizeCategory,
  ContainerMeasurement,
  ComponentVariant,
} from './breakpoints';

// Re-export the supabase project coordinates. Throws at module load in
// production if the env vars are missing — see ./supabase.ts:requiredEnv().
export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_FUNCTIONS_URL,
} from './supabase';

// Centralized style constants. Complement theme.ts with layout/visual
// values that don't belong in the theme hook (border radius, input dims,
// card padding, z-index layers).
export {
  BORDER_RADIUS,
  INPUT,
  CARD,
  Z_INDEX,
  SCREEN_BODY_STYLE,
  CONTENT_WIDTH_MODE,
  MOBILE_CONTENT_MAX_WIDTH,
  MOBILE_DIALOG_MAX_WIDTH,
  MOBILE_CONTENT_WIDTH_STYLE,
  MOBILE_DIALOG_WIDTH_STYLE,
} from './styles';
export type { ContentWidthMode } from './styles';

// App-level layout config (cross-cutting switches for screen composition).
export { APP_LAYOUT } from './layout';
export type { NavDrawerBrandPersistence, NavDrawerAnchor } from './layout';
