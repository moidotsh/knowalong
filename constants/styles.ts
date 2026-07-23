// constants/styles.ts
// Centralized style constants for consistent UI across components.
// Complements theme.ts with commonly used layout and visual values.
//
// Deliberately omits:
//   - FOCUS_GLOW (arqavellum uses useFocusRing from
//     components/premium/shared/Motion.tsx, which resolves the ring color
//     from theme.brand at runtime — no hardcoded hex).
//   - SPACING (duplicates theme.spacing; use useAppTheme().spacing).

/**
 * Border radius values (in pixels). Kept in sync with theme.borderRadius
 * for non-themed consumers (StyleSheet objects that don't read the
 * theme hook).
 */
export const BORDER_RADIUS = {
  /** Small radius - subtle rounding */
  sm: 8,
  /** Medium radius - standard cards */
  md: 12,
  /** Default radius - most common */
  default: 14,
  /** Large radius - prominent cards/modals */
  lg: 16,
  /** Extra large radius - feature elements */
  xl: 20,
  /** Pill shape - fully rounded */
  pill: 9999,
} as const;

/**
 * Standard input component dimensions.
 */
export const INPUT = {
  /** Standard input height */
  height: 54,
  /** Compact input height for dense layouts */
  heightCompact: 44,
  /** Standard horizontal padding */
  paddingX: 16,
} as const;

/**
 * Card layout constants.
 */
export const CARD = {
  /** Standard card padding */
  padding: 16,
  /** Compact card padding */
  paddingCompact: 12,
  /** Card accent bar width */
  accentBarWidth: 3,
} as const;

/**
 * Z-index layers for common UI elements. Use sparingly — most layering is
 * handled by DOM order + the dialog/toast portals. Reach for these only
 * when two surfaces genuinely compete (e.g. a sticky header vs. a popover).
 */
export const Z_INDEX = {
  /** Base layer - normal content */
  base: 0,
  /** Dropdowns and popovers */
  dropdown: 100,
  /** Sticky headers */
  sticky: 200,
  /** Overlays and backdrops */
  overlay: 300,
  /** Modals */
  modal: 400,
  /** Tooltips */
  tooltip: 500,
  /** Toast notifications */
  toast: 600,
} as const;

/**
 * Content-width policy mode.
 *
 * The constrained mobile content column is Arqavellum's current default
 * layout policy, NOT a universal permanent rule. A consumer that
 * deliberately wants fluid layouts (its own responsive width strategy,
 * or a future real tablet/desktop design contract) flips this single
 * constant to `'fluid'`.
 *
 * - `'constrained'` (default): Arqavellum enforces a shared screen-body
 *   and portal-panel width system. SB1 (audit-screen-body.ts) and SB2
 *   (audit-mobile-content-width.ts) actively check that screen bodies
 *   and Modal portal panels apply the canonical policy styles.
 *
 * - `'fluid'`: The consumer owns width behavior. SB1 and SB2 skip
 *   their content-width findings (everything else still runs). Fluid
 *   mode does NOT itself implement tablet/desktop support — it merely
 *   removes the column cap so the consumer can compose its own
 *   responsive width strategy without fighting the shell.
 *
 * Both audits import this constant at module load, so the same source
 * of truth governs runtime styles and pre-commit enforcement.
 *
 * Switching this to `'fluid'` is a repository-level architecture
 * decision, not a per-component workaround. It does NOT relax Modal
 * safety (C2), accessibility, safe areas, theme, reduced motion, or
 * any non-width audit.
 */
export type ContentWidthMode = 'constrained' | 'fluid';
export const CONTENT_WIDTH_MODE: ContentWidthMode = 'constrained';

/**
 * Constrained-mode cap for full-width mobile content: sheets, anchored
 * panels, full-width form rows, the screen body. Internal to the
 * policy-derived styles below — component code SHOULD reference
 * `MOBILE_CONTENT_WIDTH_STYLE` (the spread), not this scalar, so that
 * flipping `CONTENT_WIDTH_MODE` to `'fluid'` actually removes the cap.
 *
 * Kept as a top-level export only so the policy-derived styles and the
 * audit tests can read the canonical value from one place.
 */
export const MOBILE_CONTENT_MAX_WIDTH = 420;

/**
 * Constrained-mode cap for centered mobile modals (MobileDialog) and
 * pinned overlays (Toast). Intentionally narrower than
 * `MOBILE_CONTENT_MAX_WIDTH`: a centered modal reads as a focused
 * interruptive surface, not a full-width sheet. Internal to the
 * policy-derived styles — component code SHOULD reference
 * `MOBILE_DIALOG_WIDTH_STYLE`.
 */
export const MOBILE_DIALOG_MAX_WIDTH = 380;

// ── Policy-derived width styles ──────────────────────────────────────
//
// The canonical way to apply the column constraint. Components spread
// these into a StyleSheet entry or inline style — never re-assemble
// `width + maxWidth + alignSelf` from the scalars above.
//
// In `'fluid'` mode both styles collapse to empty objects. Components
// must not assume centering or capping is present in fluid mode; they
// own their width behavior entirely.
//
// `as const` on the constrained variants preserves the literal types
// (`alignSelf: 'center'`, `width: '100%'`) so StyleSheet spreads
// typecheck cleanly under RN's narrow ViewStyle types. The fluid
// branches are typed as `Record<string, never>` — an empty style —
// which is assignable anywhere a ViewStyle fragment is expected.

const CONSTRAINED_CONTENT_WIDTH_STYLE = {
  width: '100%' as const,
  maxWidth: MOBILE_CONTENT_MAX_WIDTH,
  alignSelf: 'center' as const,
};

const CONSTRAINED_DIALOG_WIDTH_STYLE = {
  width: '100%' as const,
  maxWidth: MOBILE_DIALOG_MAX_WIDTH,
  alignSelf: 'center' as const,
};

/**
 * Policy-derived width style for full-width mobile content: screen
 * body, sheets, anchored panels, full-width rows. Spread into the
 * component's StyleSheet entry — do NOT inline `maxWidth` from the
 * scalar constant.
 *
 * - `'constrained'`: `width: 100%, maxWidth: 420, alignSelf: center`.
 * - `'fluid'`: `{}` (no width rules; consumer owns layout).
 */
export const MOBILE_CONTENT_WIDTH_STYLE =
  CONTENT_WIDTH_MODE === 'constrained'
    ? CONSTRAINED_CONTENT_WIDTH_STYLE
    : ({} as Record<string, never>);

/**
 * Policy-derived width style for centered mobile modals (MobileDialog)
 * and pinned overlays (Toast). Narrower than `MOBILE_CONTENT_WIDTH_STYLE`
 * by design.
 *
 * - `'constrained'`: `width: 100%, maxWidth: 380, alignSelf: center`.
 * - `'fluid'`: `{}` (no width rules; consumer owns layout).
 */
export const MOBILE_DIALOG_WIDTH_STYLE =
  CONTENT_WIDTH_MODE === 'constrained'
    ? CONSTRAINED_DIALOG_WIDTH_STYLE
    : ({} as Record<string, never>);

/**
 * The screen-body centered-column constraint. Every full-screen route's
 * body container (ScrollView, FlatList, or outermost View) applies this
 * via `[SCREEN_BODY_STYLE, ...]` or `...SCREEN_BODY_STYLE` in its body
 * StyleSheet entry.
 *
 * Why a constant and not a wrapper primitive: the body is one of three
 * shapes (ScrollView / FlatList / View) and each carries screen-specific
 * contentContainerStyle / keyboard handling / ref / onScroll props. A
 * wrapper would need 80% of those props to earn its keep. A constant is
 * the minimum surface that enforces the constraint identically across
 * every consumer.
 *
 * Consumes `MOBILE_CONTENT_WIDTH_STYLE` so the screen body tracks the
 * repository's `CONTENT_WIDTH_MODE` policy. In constrained mode the
 * spread contributes `width: '100%', maxWidth: 420, alignSelf: 'center'`.
 * In fluid mode the spread collapses to `{}`, so the body keeps only
 * `flex: 1` — the consumer owns width behavior. (`width: '100%'` is
 * NOT repeated here because the constrained spread already carries it
 * and TS2783 would fire on the duplicate; fluid mode intentionally
 * leaves the body without an explicit width so consumer layouts can
 * diverge from full-width if they need to.)
 *
 * Enforced by scripts/audit-screen-body.ts (SB1) — every app/*.tsx
 * screen must reference SCREEN_BODY_STYLE. The audit exists because the
 * per-screen inline approach silently drifted (5 screens lost the
 * constraint between QA1 and QA2); the audit prevents the next drift.
 *
 * Mobile-shaped by default. If a consumer later wants true tablet/desktop
 * layouts (multi-column dashboards, sidebar nav, persistent rails), the
 * right move is to flip `CONTENT_WIDTH_MODE` to `'fluid'` AND add a
 * sibling `DesktopPremium` kit with its own body treatment. The
 * MobilePremium primitives are tuned for mobile constraints (490px
 * height budget, safe-area insets, touch targets); reusing them at
 * desktop widths would require retuning each one. See docs/contributing.md
 * → "Adding desktop support" for the evolution path.
 */
export const SCREEN_BODY_STYLE = {
  flex: 1,
  ...MOBILE_CONTENT_WIDTH_STYLE,
};
