// hooks/useResponsive.ts
// Thin wrapper around useWindowDimensions + the breakpoints helpers in
// constants/breakpoints.ts. Resolves layout mode, container size category,
// and a few common booleans (isMobile, isTablet, etc.) from the live
// window size.
//
// Intentionally thin: PWA-first means each screen owns its container
// measurement via useContainerQuery. This hook handles the window-level
// layout question alone, not container layout.

import { useWindowDimensions } from 'react-native';
import {
  LAYOUT,
  type LayoutMode,
  type ContainerSizeCategory,
  getLayoutMode,
  getContainerSize,
  isContainerConstrained,
  shouldUseDesktopStyle,
  getComponentVariant,
  type ComponentVariant,
} from '../constants';

export interface UseResponsiveReturn {
  /** Live window width. */
  width: number;
  /** Live window height. */
  height: number;
  /** Resolved layout mode from BREAKPOINTS. */
  layoutMode: LayoutMode;
  /** True when layoutMode === 'mobile'. */
  isMobile: boolean;
  /** True when layoutMode === 'tablet'. */
  isTablet: boolean;
  /** True when layoutMode is 'smallDesktop' or 'desktop'. */
  isDesktop: boolean;
  /** True when width >= wide-mobile threshold (desktop-style components). */
  shouldUseDesktopStyle: boolean;
  /** Resolved component variant for the live width. */
  componentVariant: ComponentVariant;
  /** Sidebar layout tokens (mobile-only in arqavellum; consumers extend). */
  layout: typeof LAYOUT;
  /** Resolve a container-size category from an arbitrary width. */
  getContainerSize: (width: number) => ContainerSizeCategory;
  /** True when the given width is below the comfort threshold. */
  isContainerConstrained: (width: number) => boolean;
}

/**
 * Window-level responsive state. For element-level responsive state
 * (a specific surface shrinking/growing), use `useContainerQuery` instead.
 */
export function useResponsive(): UseResponsiveReturn {
  const { width, height } = useWindowDimensions();
  const layoutMode = getLayoutMode(width);

  return {
    width,
    height,
    layoutMode,
    isMobile: layoutMode === 'mobile',
    isTablet: layoutMode === 'tablet',
    isDesktop: layoutMode === 'smallDesktop' || layoutMode === 'desktop',
    shouldUseDesktopStyle: shouldUseDesktopStyle(width),
    componentVariant: getComponentVariant(width),
    layout: LAYOUT,
    getContainerSize,
    isContainerConstrained,
  };
}

export default useResponsive;
