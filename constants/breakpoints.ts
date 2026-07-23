// constants/breakpoints.ts
// Responsive breakpoint definitions. Arqavellum is PWA-first so the desktop
// breakpoints are intentionally slim (no sidebar collapse, no right-panel
// threshold). Container queries are preserved verbatim — they're the
// load-bearing size-detection mechanism for MobilePremium components.

export const BREAKPOINTS = {
  MOBILE: 700,
  TABLET: 1024,
  SMALL_DESKTOP: 1280,
  DESKTOP: 1440,
} as const;

export const CONTAINER_THRESHOLDS = {
  COMPACT: 280,
  MEDIUM: 450,
  COMFORTABLE: 600,
  SPACIOUS: 800,
} as const;

export const COMPONENT_THRESHOLDS = {
  NARROW: 350,
  MEDIUM: 400,
  WIDE_MOBILE: 550,
  DESKTOP_STYLE: 700,
} as const;

export const HEIGHT_THRESHOLDS = {
  SHORT: 180,
  // The 490px height-budget test from the mobile design system — the
  // threshold under which compact (mobile browser) variants kick in.
  MOBILE_HEIGHT_BUDGET: 490,
} as const;

export const RESIZE_DEBOUNCE_MS = 250;

export type LayoutMode = 'mobile' | 'tablet' | 'smallDesktop' | 'desktop';

export function getLayoutMode(width: number): LayoutMode {
  if (width < BREAKPOINTS.MOBILE) return 'mobile';
  if (width < BREAKPOINTS.TABLET) return 'tablet';
  if (width < BREAKPOINTS.SMALL_DESKTOP) return 'smallDesktop';
  return 'desktop';
}

export type ContainerSizeCategory = 'compact' | 'medium' | 'comfortable' | 'spacious';

export interface ContainerMeasurement {
  width: number;
  height: number;
  size: ContainerSizeCategory;
  isConstrained: boolean;
  isShort: boolean;
  aspectRatio: number;
}

export function getContainerSize(width: number): ContainerSizeCategory {
  if (width < CONTAINER_THRESHOLDS.COMPACT) return 'compact';
  if (width < CONTAINER_THRESHOLDS.MEDIUM) return 'medium';
  if (width < CONTAINER_THRESHOLDS.COMFORTABLE) return 'comfortable';
  return 'spacious';
}

export function isContainerConstrained(width: number): boolean {
  return width < CONTAINER_THRESHOLDS.COMFORTABLE;
}

export function isContainerShort(height: number): boolean {
  return height > 0 && height < HEIGHT_THRESHOLDS.SHORT;
}

export const SPACING_BY_MODE = {
  mobile: 12,
  tablet: 16,
  desktop: 24,
} as const;

export type ComponentVariant = 'compact' | 'medium' | 'full';

export const COMPONENT_VARIANT_THRESHOLDS = {
  compact: COMPONENT_THRESHOLDS.NARROW,
  medium: COMPONENT_THRESHOLDS.WIDE_MOBILE,
  full: COMPONENT_THRESHOLDS.WIDE_MOBILE,
} as const;

export function getComponentVariant(width: number): ComponentVariant {
  if (width < COMPONENT_VARIANT_THRESHOLDS.compact) return 'compact';
  if (width < COMPONENT_VARIANT_THRESHOLDS.medium) return 'medium';
  return 'full';
}

export function shouldUseDesktopStyle(width: number): boolean {
  return width >= COMPONENT_THRESHOLDS.WIDE_MOBILE;
}

export function getPreviewRowCount(width: number): number {
  if (width < COMPONENT_THRESHOLDS.MEDIUM) return 3;
  if (width < COMPONENT_THRESHOLDS.DESKTOP_STYLE) return 4;
  return 5;
}

export function shouldShowExpandedContent(width: number): boolean {
  return width >= COMPONENT_THRESHOLDS.MEDIUM;
}

export function canFitMultipleColumns(width: number): boolean {
  return width >= CONTAINER_THRESHOLDS.COMFORTABLE;
}

// Layout tokens — mobile-only sidebar/nav drawer. Arqavellum doesn't ship a
// desktop sidebar; consumers adding one extend this block.
export const LAYOUT = {
  SIDEBAR: {
    WIDTH_EXPANDED: 250,
    WIDTH_COLLAPSED: 64,
  },
  RIGHT_PANEL: {
    WIDTH: 320,
  },
  PADDING: {
    COMPACT: 16,
    DEFAULT: 24,
  },
  Z_INDEX: {
    SIDEBAR_DRAWER: 100,
    TOOLTIP: 200,
  },
  MOBILE_NAV_DRAWER: {
    HEADER_TOP_GUTTER: 14,
    CUTOUT_HEIGHT: 60,
  },
} as const;
