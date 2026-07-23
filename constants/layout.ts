// constants/layout.ts
// App-level layout config. Single source of truth for cross-cutting
// switches that affect how screens compose primitives. The primitives
// themselves stay generic; this file is where the app author flips
// global behavior without editing the MobilePremium kit.

export type NavDrawerBrandPersistence = 'cutout' | 'slideout';

export type NavDrawerAnchor = 'window' | 'column';

export const APP_LAYOUT = {
  /**
   * How the nav drawer handles the brand area when open.
   *
   * - 'cutout': the panel + scrim start below the home header so the
   *   brand + hamburger (which swaps to X) stay visible at the same
   *   position.
   * - 'slideout': the panel covers the full screen height; the brand is
   *   re-rendered in the drawer's header slot. The home header is
   *   covered while the drawer is open.
   *
   * Default is 'cutout' (the more polished pattern).
   */
  navDrawerBrandPersistence: 'cutout' as NavDrawerBrandPersistence,

  /**
   * Where the nav drawer slides in from on wide viewports.
   *
   * - 'window': panel slides from x=0 of the window. On wide desktop
   *   the drawer appears detached from the centered 420pt column.
   * - 'column': panel slides from the left edge of the centered 420pt
   *   column, so the drawer stays attached to the centered content on
   *   any viewport. The user doesn't need to resize their browser to
   *   ~440px wide to get a sensible layout.
   *
   * Default is 'column' (works on both mobile and desktop without
   * resizing). On narrow viewports (<=420pt) the two modes converge —
   * the column's left edge IS the window's left edge.
   */
  navDrawerAnchor: 'column' as NavDrawerAnchor,
} as const;
