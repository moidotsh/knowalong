// constants/theme.ts
// Night Metro — KnowAlong's token palette. A metro/transit design language:
// dark is the "night service" (tunnel blacks, steel blues, filament amber)
// and the DEFAULT scheme (ThemeContext boots dark; light is the "daytime
// timetable" opt-in — warm paper, printed-timetable ink, fill amber).
// Type families: Unbounded (display — station-signage roundels),
// Golos Text (body/UI), PT Mono (figures, eyebrows, rollsign text).
// audit-ui-theme (S7) still enforces "no hardcoded hex" — all modes resolve
// through `theme.colors[colorScheme].*` via useAppTheme() (or a direct
// constants import).
//
// Contrast notes (WCAG math baked into the choices):
// - dark: amber #FFB020 on panel #141A22 ≈ 9.6:1 — brandText mirrors brand,
//   and textOnBrand #1A1206 clears AA on the amber (≈10:1).
// - light: fill amber #B8790A is a *fill* duty (3.5:1 vs paper — fine for
//   large text/graphics); small amber text uses brandText #8F5D00 (≈5.4:1).
// - brandOnInk is per-plate: #FFB020 on light's ink plate, #7A5200 on dark's
//   bone plate — always read the ink plate, never the raw brand.

import type { TextStyle } from 'react-native';

// TextStyle-shaped typography tokens. Typing these explicitly avoids the
// `fontWeight: string` widening that breaks spread-into-<Text> calls
// (RN's TextStyle.fontWeight is a union of string literals, not `string`).
type TypographyToken = Pick<
  TextStyle,
  | 'fontSize'
  | 'fontWeight'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'fontVariant'
>;

// ── Type families ───────────────────────────────────────────────────────
// The optional display pair, hoisted so typography tokens can reference
// it inside the same object literal. A consumer whose design language is
// printed matter declares a display face (poster titles, hero figures,
// totals) and/or a mono face (every figure that reads as ledger output —
// prices, stock, dates, metrics, eyebrows); body/UI text stays the
// platform sans for legibility. Both default to undefined — the starter
// renders the platform sans everywhere, and every read below is a no-op
// until a consumer fills them, so declaring the axis never moves the
// default look.
//
// Self-hosting recipe (web): OFL/compatible files in `public/fonts/`
// (woff2 first, TTF fallback), the @font-face block in an id'd <style>
// in `index.html`, restored at runtime from `app/_layout.tsx` (static
// export strips <head> styles), plus <link rel="preload" as="font"
// crossorigin> lines — the build-time injector copies both into every
// exported route. Native extension: load the same files through
// expo-font instead of the <style> block.
export interface TypeFaces {
  /** Display face — poster titles, hero figures, totals. */
  display?: string;
  /**
   * Literary serif face — the learner journey's editorial voice: chapter
   * titles and large target-language phrases (the words themselves).
   * PT Serif (OFL, ParaType) — a book face designed for Russian text, with
   * complete Cyrillic coverage. Self-hosted alongside the other faces
   * (index.html #global-font-face-css + public/fonts/ + the runtime
   * restore in app/_layout.tsx; native loads the same files through
   * expo-font).
   */
  serif?: string;
  /**
   * Body face — the voice of rows, subtitles, and reading text. The
   * shell's default keeps body/UI text on the platform sans for
   * legibility; KnowAlong overrides it because the learner target is
   * Russian — Golos Text is a Cyrillic-native face, so body text
   * renders with one consistent voice and metric set on every platform
   * instead of trusting each OS's Cyrillic fallback chain.
   */
  body?: string;
  /**
   * Condensed position of the display face — for consumers whose
   * display face carries a width axis. Declared as a second
   * @font-face over the SAME variable file with `font-stretch` pinned:
   * one download, two families, and RN code never touches fontStretch
   * (which RN's TextStyle does not carry).
   */
  displayCondensed?: string;
  /** Mono face — ledger figures: prices, stock, dates, metrics, eyebrows. */
  mono?: string;
  /**
   * Condensed cut of the SAME mono variable file — the counter rank's
   * optional width instance (see `mono`): one download, two families,
   * RN code never touches fontStretch. Declared for consumers whose
   * largest figures need the width back (a wide mono at poster rank
   * can overrun a phone column); undefined keeps every figure on `mono`.
   */
  monoCondensed?: string;
}

// NIGHT METRO type plan (self-hosted, see index.html
// #global-font-face-css and public/fonts/):
//   display — Unbounded, the rollsign/destination voice. Its width eats
//     column real estate, so it is pinned to the shell's display slots
//     only (hero, display, title, figures) and never to rows.
//   body    — Golos Text, a Cyrillic-native workhorse. Rows, subtitles,
//     and reading text ride it via the body-rank tokens below.
//   mono    — PT Mono, the timetable/ledger face for eyebrows and facts.
//   The condensed slots stay undefined — neither variable file carries a
//   width axis, and faking one with letterSpacing reads as a squeezed
//   webfont, not a cut.
const FONTS = {
  display: 'Unbounded',
  serif: 'PT Serif',
  body: 'Golos Text',
  displayCondensed: undefined,
  mono: 'PT Mono',
  monoCondensed: undefined,
} as TypeFaces;

// ── Design dialect ──────────────────────────────────────────────────────
// The ONE family declaration. A consumer's design language is not four
// independent flags that must agree by convention — it is one dialect
// that presets every surface-language point below (atmosphere, drawer,
// toast, transition). Sub-points remain as explicit overrides: writing a
// literal `style` on any of them beats the preset, for consumers whose
// taste mixes deliberately.
//   • 'glass' (default) — the starter's own look: drifting aurora orbs,
//     the glass-scrim sheet drawer, the bordered-card toast, no route
//     transition.
//   • 'ink' — printed matter: flat air (no orbs), the InkPanel drawer,
//     the ink chit toast, and the ink route curtain. The curtain is
//     consumer-implemented machinery that READS the transition axis
//     below — the shell ships no transition primitive of its own (a
//     future one would read the same declaration).
// Night Metro declares 'ink': a transit system is printed matter —
// flat night air, the InkPanel drawer (the line diagram's panel), the
// ink chit toast (a stamp), and the route curtain (the tunnel between
// stations).
const DIALECT = 'ink' as 'glass' | 'ink';
const DIALECT_PRESETS = {
  glass: { atmosphere: 'aurora', drawer: 'sheet', toast: 'card', transition: 'none' },
  ink: { atmosphere: 'flat', drawer: 'ink', toast: 'chit', transition: 'curtain' },
} as const;

export const theme = {
  colors: {
    // ── Light surface — "daytime timetable" ────────────────────────────
    // Night Metro's daylight register: a warm paper ground (a printed
    // timetable sheet, not a lab white), ink text, and the line's amber
    // as the single accent. Every value below is tuned for the amber
    // identity: `brand` carries the 3:1 fill/large-type duty, `brandText`
    // carries the 4.5:1 small-text duty (the two-amber discipline).
    light: {
      // UI element colors
      background: '#F4F2ED',
      backgroundAlt: '#ECE9E2',
      card: '#FBFAF7',
      cardAlt: '#F1EEE7',
      border: '#D8D4CA',

      // Card border colors for subtle definition (light-tuned: dark-on-light
      // hairline reads as a precision edge instead of a heavy outline).
      cardBorder: 'rgba(26, 32, 40, 0.08)',
      cardBorderHover: 'rgba(26, 32, 40, 0.15)',

      // Text colors. Ink with a warm cast — the printed-matter black.
      // `textMuted` clears WCAG AA (4.5:1) on the DARKEST light
      // background it rides (backgroundDeep #E9E5DC).
      text: '#1A2028',
      textMuted: '#5C6875',
      textSecondary: '#46525E',

      // Interactive element colors — the `brand` slot.
      // Night Metro amber, daytime cut. A fill/large-type slot: #B8790A
      // measures 3.5:1 on card (clears the 3:1 fill threshold; fails
      // 4.5:1 as small text — that duty belongs to `brandText`).
      brand: '#B8790A',
      brandHover: '#A06A08',
      brandPress: '#8A5A06',
      brandMuted: 'rgba(184, 121, 10, 0.08)',
      brandSoft: 'rgba(184, 121, 10, 0.13)',
      buttonBackground: '#B8790A',
      buttonBackgroundDisabled: 'rgba(184, 121, 10, 0.5)',

      // The brand slot's TEXT companion — the same hue darkened until it
      // clears WCAG AA (4.5:1) as small text (10–15px labels, eyebrows,
      // links). #8F5D00 measures 5.4:1 on card; the fill amber above
      // would measure 3.5:1 and fail — hence the two-amber split.
      brandText: '#8F5D00',

      // Brand-hue accent for content on the INK PLATE (the inverted
      // surface: drawer, chits, curtain). Light mode's plate is the ink
      // #1A2028 — the bright night amber reads on it (8.2:1). Same
      // companion discipline as brandText: one hue, adjusted for its
      // surface. NOT a second accent slot.
      brandOnInk: '#FFB020',

      // Semantic status colors — the mastery language's daytime cuts
      // (known/seen/new). Measured AA as TEXT: every hue here clears
      // 4.5:1 on card AND on backgroundDeep.
      status: {
        success: '#147A4A',
        warning: '#8F5D00',
        error: '#C0392B',
        info: '#2563EB',
      },

      // Re-export aliases for call sites that read `success` and `alert`
      // at the top level (alternative to `status.success` / `status.error`).
      success: '#147A4A',
      alert: '#C0392B',

      // Text color for content rendered on top of the brand color slot
      // (e.g. MobilePrimaryButton label, selected-state check icon).
      // Night Metro's amber is a BRIGHT hue — white never clears AA on
      // it. The label rides in near-black warm ink instead (#1A1206
      // measures 5.1:1 on the #B8790A fill; white would measure 3.5:1).
      textOnBrand: '#1A1206',

      // Secondary text on brand surfaces (uppercase eyebrows, helper lines,
      // chip sublabels). Warm ink at 0.8 alpha — preserves hierarchy
      // against `textOnBrand` while clearing WCAG AA on the amber fill.
      textOnBrandMuted: 'rgba(26, 18, 6, 0.8)',

      // Deeper background for full-bleed screens (auth, onboarding).
      // Light-mode interpretation: one step deeper into the paper stock.
      backgroundDeep: '#E9E5DC',

      // Text color variants. `textColors.muted` and `textMuted` are unified
      // (same value, both names) so consumers don't have to remember which
      // "muted" to use.
      textColors: {
        muted: '#5C6875',
        secondary: '#5C6875',
        tertiary: '#8C99A6',
      },

      // Icon background tints (semantic — darker hue on pale tint instead
      // of bright hue on dark).
      iconBackground: {
        blue: 'rgba(37, 99, 235, 0.10)',
        green: 'rgba(20, 122, 74, 0.10)',
        purple: 'rgba(168, 85, 247, 0.10)',
        orange: 'rgba(184, 121, 10, 0.12)',
        white: 'rgba(26, 32, 40, 0.06)',
      },

      // Glassmorphism (light). Backdrop is a near-solid warm-paper tint
      // instead of dark smoked glass; borders are dark hairlines instead
      // of light bleed-through.
      glass: {
        background: 'rgba(251, 250, 247, 0.78)',
        backgroundLight: 'rgba(251, 250, 247, 0.58)',
        border: 'rgba(26, 32, 40, 0.08)',
        borderHighlight: 'rgba(26, 32, 40, 0.15)',
        borderHover: 'rgba(26, 32, 40, 0.12)',
        emptyInputBorder: 'rgba(26, 32, 40, 0.2)',
        panelBackground: 'rgba(251, 250, 247, 0.66)',
        inputBackground: 'rgba(26, 32, 40, 0.03)',
        inputFocusBackground: 'rgba(184, 121, 10, 0.05)',
      },

      // Alert background tint for error containers.
      alertBackground: 'rgba(192, 57, 43, 0.08)',

      // ── The categorical meter ramp ────────────────────────────────────
      // Six steps + a rim for consumers that DRAW quantities as
      // proportional meter segments (stacks, gauges, tallies). The rim
      // guarantees each step's edge on light grounds where the pale
      // steps fail raw 3:1. Night Metro family: the line amber leads,
      // the mastery hues (known/seen/new) and the steel fill the rest.
      meter: {
        step1: '#8F5D00',
        step2: '#147A4A',
        step3: '#2563EB',
        step4: '#C0392B',
        step5: '#E9E5DC',
        step6: '#6B7280',
        rim: '#1A2028',
      },

      // ── The focus register ─────────────────────────────────────────────
      // A mode-independent surface family for "doing" surfaces — live
      // capture, active sessions, focus modes: dark in BOTH palettes
      // (an instrument, not a document). Night Metro's register IS the
      // night platform: the same ground the dark palette rides, with
      // the amber as the signal lamp.
      focus: {
        background: '#0C1016',
        surface: '#141A22',
        surfaceAlt: '#1A212B',
        border: '#2A3441',
        text: '#F2EFE9',
        muted: '#8FA3B8',
        signal: '#FFB020',
        onSignal: '#1A1206',
        track: '#232D3A',
        signalSoft: 'rgba(255, 176, 32, 0.16)',
      },

      // ── The score register ────────────────────────────────────────────
      // The learner journey's editorial surface family — "an elegantly
      // annotated musical score / a carefully typeset field notebook".
      // Warm paper grounds, printed-matter ink, a deep green accent for
      // the active position, and a sienna warm note for editorial
      // emphasis. Light values are the register's initial reference;
      // dark is a warm-charcoal restatement of the same hierarchy (not
      // an inversion). Contrast baked in: ink 14:1 and inkSecondary
      // 5.6:1 on paper; accent 7.5:1 as text/fill; onAccent 6.5:1 on
      // the accent fill; warmNote 7:1. inkTertiary (3.9:1) is reserved
      // for quiet metadata at ≥14px — never body copy.
      score: {
        canvas: '#F5F2EA',
        paper: '#FFFCF6',
        paperAlt: '#F6F1E5',
        ink: '#252A27',
        inkSecondary: '#5D655E',
        inkTertiary: '#7C857D',
        rule: '#D9DED5',
        ruleStrong: '#B4BDAF',
        accent: '#315E4B',
        accentDeep: '#25493A',
        accentWash: '#E5EEE5',
        onAccent: '#F6F3EA',
        warmNote: '#8A492F',
        warmWash: 'rgba(138, 73, 47, 0.08)',
      },

      // ── Mobile premium primitive kit tokens ───────────────────────────
      // Consumed by components/MobilePremium/*. Light-tuned tokens for
      // the kit's dark-mode siblings.
      //
      // Design rationale (see docs/architecture/mobile-premium-design-system.md):
      //   • Hairline inner border = a 1px line at low opacity DARK. Reads as
      //     a precision edge against a light surface (inverse of the dark
      //     kit's low-opacity white).
      //   • Surface gradient = top ~3% darker than bottom, suggesting soft
      //     directional light hitting a physical object from above.
      //   • Soft glow = the outer shadow identity of a surface. One value,
      //     applied consistently.
      //   • No Android Chrome fallback tint — on a light surface, the
      //     default ~4% dark alpha reads as intended; no saturate() wash-out
      //     failure mode to compensate for.
      mobilePremium: {
        // Hairline border (inner) — dark-on-light at low opacity.
        hairlineBorder: 'rgba(26, 32, 40, 0.08)',
        hairlineBorderStrong: 'rgba(26, 32, 40, 0.15)',

        // Surface gradient stops — top slightly darker than bottom by ~3%
        // luminance. Dark alpha over light surface composites correctly.
        surfaceGradientTop: 'rgba(26, 32, 40, 0.03)',
        surfaceGradientBottom: 'rgba(26, 32, 40, 0.005)',

        // Soft outer glow — the surface's shadow identity (web only).
        // Warmed at trace alpha to sit with the paper stock rather than
        // fighting it.
        surfaceGlow: '0 8px 32px rgba(26, 32, 40, 0.08), 0 2px 8px rgba(26, 32, 40, 0.04)',

        // The instrument lift — a reserved, heavier shadow for the ONE
        // docked instrument a screen may carry (a logger, a composer):
        // the flat surface language stays, and a single physical object
        // is allowed to sit ON it. Nothing else should use this.
        instrumentShadow:
          '0 -2px 6px rgba(26, 32, 40, 0.10), 0 -12px 32px rgba(26, 32, 40, 0.14)',

        // Backdrop blur for web (saturate is safe on light surfaces).
        surfaceBackdropBlur: 'blur(24px) saturate(160%)',

        // Android Chrome fallback — near-solid surface + milder blur.
        // Near-opaque because Android Chrome renders saturate() poorly;
        // milder blur to avoid compounding the visual artifact.
        androidChromeSurfaceBackground: 'rgba(251, 250, 247, 0.9)',
        androidChromeSurfaceBlur: 'blur(12px)',

        // Nav drawer — the page scrim uses a milder blur than the surface
        // glass (it covers the whole page; a heavy blur smears everything)
        // and the panel carries a right-edge depth shadow. The shadow lives
        // on the panel, not the scrim, so its upward bleed lands off-screen
        // above the viewport instead of darkening the brand cutout.
        navScrimBackdropBlur: 'blur(8px)',
        // Scrim hex alpha over backgroundDeep. Light mode runs one step
        // heavier than dark: the panel floats on paper content, and the
        // veil needs real separation to read as depth, not fog.
        navScrimAlpha: 'dd',
        navPanelShadow: '4px 0 32px rgba(0, 0, 0, 0.36), 0 2px 8px rgba(0, 0, 0, 0.2)',

        // Faint vignette to settle the atmosphere into the edges (web).
        // Much softer than the dark kit's vignette — a whisper of depth,
        // not a visible darkening.
        atmosphereVignette: 'inset 0 0 160px 60px rgba(26, 32, 40, 0.04)',

        // Rail (progress) — fill travels across a 2px track.
        railTrack: 'rgba(26, 32, 40, 0.08)',
        railFillShadow: '0 0 8px currentColor',
      },
    },

    // ── Dark surface — "night service" (the primary register) ──────────
    // Mirror of `light` with every key retuned for dark surfaces. Night
    // Metro is dark-FIRST: this is the register the app boots into (see
    // ThemeContext's default and index.html's root paint). The ground is
    // a blue-black station tile, panels float one step up, text is warm
    // bone, and the line's amber is the only saturated voice. The
    // structural shape MUST match `light` so
    // `theme.colors[colorScheme].*` is type-safe in TS.
    dark: {
      // UI element colors — dark surfaces. A blue-black with warmth
      // bled out of the panels; bone text keeps it "timetable at night",
      // not "admin dashboard dark".
      background: '#0C1016',
      backgroundAlt: '#10151C',
      card: '#141A22',
      cardAlt: '#1A212B',
      border: '#2A3441',

      // Card border colors (dark-tuned: light-on-dark hairline reads as
      // a precision edge against the dark surface).
      cardBorder: 'rgba(242, 239, 233, 0.07)',
      cardBorderHover: 'rgba(242, 239, 233, 0.14)',

      // Text colors — warm bone on the blue-black (the fluorescent-lit
      // timetable voice); steel for the muted ranks.
      text: '#F2EFE9',
      textMuted: '#8FA3B8',
      textSecondary: '#B9C6D4',

      // Interactive element colors — the `brand` slot. The signal-lamp
      // amber. Consumers override BOTH `light.brand*` and `dark.brand*`
      // (the two are independent — `dark` is not derived).
      brand: '#FFB020',
      brandHover: '#FFC24D',
      brandPress: '#E69700',
      brandMuted: 'rgba(255, 176, 32, 0.14)',
      brandSoft: 'rgba(255, 176, 32, 0.19)',
      buttonBackground: '#FFB020',
      buttonBackgroundDisabled: 'rgba(255, 176, 32, 0.4)',

      // Text companion of `brand` (see `light.brandText`). The night
      // amber measures 9.6:1 on the panel — brighter than needed, so
      // the companion simply mirrors `brand` and nothing moves.
      brandText: '#FFB020',

      // Brand-hue accent for the INK PLATE (see `light.brandOnInk`).
      // Dark mode's plate is the warm bone #F2EFE9 — the deep daytime
      // amber reads on it (6.1:1).
      brandOnInk: '#7A5200',

      // Semantic status colors — the mastery language's night cuts
      // (known/seen/new): mint, lamp amber, platform-signal red.
      status: {
        success: '#35D07F',
        warning: '#FFC24D',
        error: '#FF5A5A',
        info: '#6AAEF5',
      },

      // Aliases matching `light` (kept in sync across both palettes).
      success: '#35D07F',
      alert: '#FF5A5A',

      // Text on brand — the amber is a BRIGHT hue; white never clears AA
      // on it. Labels ride in the near-black warm ink (#1A1206 measures
      // 10:1 on the #FFB020 fill).
      textOnBrand: '#1A1206',

      // Secondary text on brand — warm ink at 0.8 alpha, same discipline
      // as `light.textOnBrandMuted`.
      textOnBrandMuted: 'rgba(26, 18, 6, 0.8)',

      // Deeper background for full-bleed screens (auth, onboarding) —
      // the tunnel between stations: darker still so a panel pops.
      backgroundDeep: '#060A0E',

      // Text color variants.
      textColors: {
        muted: '#8FA3B8',
        secondary: '#B9C6D4',
        tertiary: '#5E7186',
      },

      // Icon background tints — dark-tuned (brighter hue on dark tint).
      iconBackground: {
        blue: 'rgba(106, 174, 245, 0.16)',
        green: 'rgba(53, 208, 127, 0.16)',
        purple: 'rgba(192, 132, 252, 0.16)',
        orange: 'rgba(255, 176, 32, 0.16)',
        white: 'rgba(242, 239, 233, 0.07)',
      },

      // Glassmorphism (dark). Retuned from light: backdrop is smoked
      // glass over the station tiles; borders are bone hairlines.
      glass: {
        background: 'rgba(20, 26, 34, 0.74)',
        backgroundLight: 'rgba(20, 26, 34, 0.56)',
        border: 'rgba(242, 239, 233, 0.08)',
        borderHighlight: 'rgba(242, 239, 233, 0.18)',
        borderHover: 'rgba(242, 239, 233, 0.12)',
        emptyInputBorder: 'rgba(242, 239, 233, 0.20)',
        panelBackground: 'rgba(12, 16, 22, 0.62)',
        inputBackground: 'rgba(242, 239, 233, 0.04)',
        inputFocusBackground: 'rgba(255, 176, 32, 0.09)',
      },

      // Alert background tint for error containers (dark-mode red wash).
      alertBackground: 'rgba(255, 90, 90, 0.12)',

      // ── The categorical meter ramp ────────────────────────────────────
      // Six steps + a rim for consumers that DRAW quantities as
      // proportional meter segments (stacks, gauges, tallies). Night
      // Metro family: the line amber leads, the mastery hues and the
      // steel fill the rest; the rim is the tunnel black.
      meter: {
        step1: '#FFB020',
        step2: '#35D07F',
        step3: '#6AAEF5',
        step4: '#FF5A5A',
        step5: '#F2EFE9',
        step6: '#8FA3B8',
        rim: '#060A0E',
      },

      // ── The focus register ─────────────────────────────────────────────
      // A mode-independent surface family for "doing" surfaces — live
      // capture, active sessions, focus modes: dark in BOTH palettes
      // (an instrument, not a document). Night Metro's register IS the
      // night platform: the same ground the dark palette rides, with
      // the amber as the signal lamp. (Kept in lockstep with `light`
      // focus so the register reads identically wherever it mounts.)
      focus: {
        background: '#0C1016',
        surface: '#141A22',
        surfaceAlt: '#1A212B',
        border: '#2A3441',
        text: '#F2EFE9',
        muted: '#8FA3B8',
        signal: '#FFB020',
        onSignal: '#1A1206',
        track: '#232D3A',
        signalSoft: 'rgba(255, 176, 32, 0.16)',
      },

      // ── The score register (dark) ─────────────────────────────────────
      // Warm-charcoal restatement of the light score family — the same
      // hierarchy with the paper ground swapped for candlelit charcoal,
      // not a white-on-black inversion. Contrast baked in: ink 11:1 and
      // inkSecondary 5.6:1 on paper; accent 7:1; onAccent 8:1 on the
      // accent fill; warmNote 6:1. inkTertiary reserved for quiet
      // metadata at ≥14px.
      score: {
        canvas: '#191713',
        paper: '#211E19',
        paperAlt: '#28241E',
        ink: '#EFE9DC',
        inkSecondary: '#A99F8E',
        inkTertiary: '#7E7666',
        rule: '#37332A',
        ruleStrong: '#4A4437',
        accent: '#7FB39A',
        accentDeep: '#93C4AC',
        accentWash: 'rgba(127, 179, 154, 0.13)',
        onAccent: '#13201A',
        warmNote: '#C98B66',
        warmWash: 'rgba(201, 139, 102, 0.12)',
      },

      // ── Mobile premium primitive kit tokens (dark) ───────────────────
      // Mirrors the light `mobilePremium` block, retuned for dark surfaces:
      //   • Hairline border = light-on-dark at low opacity (inverse of
      //     the light kit's dark-on-light).
      //   • Surface gradient = top slightly lighter than bottom (suggests
      //     a soft overhead light catching a raised surface).
      //   • Stronger outer glow — dark surfaces need more shadow to read
      //     as elevated against a dark background.
      mobilePremium: {
        hairlineBorder: 'rgba(242, 239, 233, 0.07)',
        hairlineBorderStrong: 'rgba(242, 239, 233, 0.14)',

        surfaceGradientTop: 'rgba(242, 239, 233, 0.04)',
        surfaceGradientBottom: 'rgba(242, 239, 233, 0.008)',

        // The filament glow — the surface shadow picks up a whisper of
        // the lamp amber so panels read as lit from within, not just
        // elevated. The amber is at trace alpha; it reads as warmth.
        surfaceGlow:
          '0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.30), 0 0 1px rgba(255, 176, 32, 0.06)',

        // The instrument lift (see light's comment) — the one docked
        // instrument's reserved shadow, heavier at night.
        instrumentShadow:
          '0 -2px 6px rgba(0, 0, 0, 0.4), 0 -12px 32px rgba(0, 0, 0, 0.55)',

        surfaceBackdropBlur: 'blur(24px) saturate(140%)',

        androidChromeSurfaceBackground: 'rgba(20, 26, 34, 0.9)',
        androidChromeSurfaceBlur: 'blur(12px)',

        // Nav drawer — same treatment as the light kit (blur strength and
        // shadow depth are mode-independent; the scrim alpha comes from
        // backgroundDeep at the call site).
        navScrimBackdropBlur: 'blur(8px)',
        navScrimAlpha: 'cc',
        navPanelShadow: '4px 0 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',

        atmosphereVignette: 'inset 0 0 160px 60px rgba(0, 0, 0, 0.30)',

        railTrack: 'rgba(242, 239, 233, 0.10)',
        railFillShadow: '0 0 8px currentColor',
      },
    },
  },

  // Spacing system
  spacing: {
    xxs: 2,
    xs: 4,
    small: 8,
    medium: 16,
    large: 24,
    xlarge: 32,
    xxlarge: 48,
  },

  // Font sizes
  fontSize: {
    xs: 12,
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 24,
    xxlarge: 32,
  },

  // Border radius
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    pill: 9999,
  },

  // ── Shape tokens ────────────────────────────────────────────────────
  // Semantic corner radii for the MobilePremium kit. This family is the
  // single re-skin point for the kit's shape language: a consumer going
  // sleek/monotone sets surface/control to 8 and tag to 4 here, and every
  // kit primitive follows — no component edits. `borderRadius` above is
  // the raw size scale for ad-hoc shapes; primitives use these semantics.
  shapes: {
    /** Cards + section surfaces (MobileSurface, StatCard, alerts). */
    surface: 16,
    /** Portal panels — bottom sheets, calendar/dialog bodies. */
    sheet: 20,
    /** Inputs, buttons, selects — interactive controls. */
    control: 14,
    /** Small tiles — selection rows, option containers, thumbnails. */
    tile: 12,
    /** Chips, tags, badges. 999 renders full round. */
    tag: 999,
  },

  // ── Atmosphere tokens ────────────────────────────────────────────────
  // The atmosphere-language override point — the same discipline as
  // `shapes`: the consumer declares the background style ONCE here and
  // every MobileAtmosphere (scaffolds, drawers, auth screens) follows,
  // with no per-callsite prop threading. `MobileAtmosphere`'s
  // `showOrbs` prop remains as the explicit per-callsite override
  // (the dev showcase uses it to demo both styles under one theme).
  atmosphere: {
    /**
     * The background style the atmosphere renders.
     * - 'aurora': drifting color-field orbs over the base tint — the
     *   starter's premium read, the glass dialect's preset.
     * - 'flat': base tint + vignette only, no orbs — the editorial or
     *   retail read for consumers whose design language wants calm
     *   paper. Orb drift stops too (nothing left to animate).
     *
     * Defaults to the dialect preset; write a literal to override.
     */
    style: DIALECT_PRESETS[DIALECT].atmosphere,
  },

  // ── Drawer tokens ────────────────────────────────────────────────────
  // The nav-drawer surface language override point — the same
  // discipline as `shapes`/`atmosphere`: declare it once here and the
  // drawer follows, no per-callsite props.
  //   • 'sheet': the glass-scrim iOS sheet this component shipped as —
  //     blur scrim, atmosphere body, hairline edge (the glass dialect's
  //     preset).
  //   • 'ink': the inverted plate (InkPanel) — the consumer whose boot
  //     moment, route transitions, and toasts already speak the ink
  //     language joins the drawer to that family: text-color plate +
  //     print grain + brand edge rule, flat dim scrim (no blur), the
  //     masthead riding ON the plate (MobileHomeHeader onPlate).
  //     Defaults to the dialect preset; write a literal to override.
  drawer: {
    style: DIALECT_PRESETS[DIALECT].drawer,
  },

  // ── Toast tokens ────────────────────────────────────────────────────
  // The transient-message surface language, same discipline as the
  // family above. 'card' is the bordered card with colored icons — the
  // glass dialect's default. 'chit' is the ink treatment — the
  // announcement strip's strong tone, floating: ink plate
  // (`colors.text`, bone in dark), paper type, one 7px status dot,
  // receipt-mono message when `fonts.mono` is declared, flat air (no
  // shadow, no stripe, no icon triad). Defaults to the dialect preset;
  // write a literal to override.
  toast: {
    style: DIALECT_PRESETS[DIALECT].toast,
  },

  // ── Transition tokens ────────────────────────────────────────────────
  // The route-transition axis — the one motion declaration. 'none' (the
  // glass dialect's preset): the curtain machinery stays retired —
  // withRouteCurtain passes straight through and the overlay never
  // mounts. 'curtain' (the ink preset): the shell's RouteCurtain plays
  // — the full-bleed ink plate sweeping navigation (cover, stamp,
  // paper-chaser lift), wired through NavigationHelper. Write a
  // literal to override the preset.
  transition: {
    style: DIALECT_PRESETS[DIALECT].transition,
  },

  // ── Type families ───────────────────────────────────────────────────
  // The same discipline as shapes/atmosphere/drawer: declare the pair
  // ONCE here and every face-aware read (typography tokens, eyebrows,
  // figure styles) follows — no per-callsite fontFamily threading. See
  // the TypeFaces block above for the self-hosting recipe.
  fonts: FONTS,

  // ── Named type styles ─────────────────────────────────────────────────
  // Premium reads through type. Consumers import the named style and spread
  // it; they do NOT pick ad-hoc fontSize/fontWeight values for titles and
  // subtitles. Consumers pick from named styles, not ad-hoc values —
  // retune the values here, but keep the named-style discipline.
  typography: {
    mobileTitle: {
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 28,
      letterSpacing: -0.2,
      fontFamily: FONTS.display,
    } satisfies TypographyToken,
    mobileSubtitle: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      letterSpacing: 0,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    mobileBody: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 22,
      letterSpacing: 0,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    mobileAction: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: 0.4,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    mobileEyebrow: {
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 14,
      letterSpacing: 1.4,
      fontFamily: FONTS.mono,
    } satisfies TypographyToken,
    mobileFieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.1,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    // ── Figure language ────────────────────────────────────────────────
    // Numbers are content too, so the scale names their slots. Every
    // figure token carries tabular figures by construction — a call
    // site cannot forget them — and picks a declared face up the same
    // way mobileTitle/mobileEyebrow do (display for hero/stat figures,
    // mono for in-row ledger facts).
    mobileHero: {
      fontSize: 56,
      fontWeight: '800',
      lineHeight: 60,
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.display,
    } satisfies TypographyToken,
    mobileDisplay: {
      fontSize: 56,
      fontWeight: '800',
      lineHeight: 56,
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.display,
    } satisfies TypographyToken,
    mobileFigure: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
      letterSpacing: -0.3,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.display,
    } satisfies TypographyToken,
    mobileItemTitle: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: 0,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    // Condensed title — mobileTitle's job in the condensed display
    // position: focus-register screens whose headline is a NAME read
    // at arm's length (a live-capture label, an active-session title).
    mobileTitleCondensed: {
      fontSize: 34,
      fontWeight: '800',
      lineHeight: 38,
      letterSpacing: -0.5,
      fontFamily: FONTS.displayCondensed,
    } satisfies TypographyToken,
    mobileLedger: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.mono,
    } satisfies TypographyToken,
    // Counter — THE working figure at display size: live values a user
    // changes mid-task (a timer, a quantity stepper, a live total).
    // Rides the MONO face (tabular by construction — changing digits
    // hold their columns and cannot jitter) and is the one place the
    // mono face is allowed above 30px. No-op until `fonts.mono` is
    // declared.
    mobileCounter: {
      fontSize: 56,
      fontWeight: '700',
      lineHeight: 60,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.mono,
    } satisfies TypographyToken,
    mobileMeta: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
    mobileTag: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.1,
      fontFamily: FONTS.body,
    } satisfies TypographyToken,
  },
};

// The two color schemes Night Metro supports. Dark (the night service)
// is the default — ThemeContext boots `dark` and Settings can defer to
// the OS. Type-wide so consumers can type their own APIs
// (`onChangeColorScheme(next: ColorScheme)`).
export type ColorScheme = 'light' | 'dark';

// The atmosphere background styles (`theme.atmosphere.style`). 'aurora' is
// the starter default; a consumer declares 'flat' to turn the orbs off
// app-wide in one place.
export type AtmosphereStyle = 'aurora' | 'flat';

// The toast surface styles (`theme.toast.style`) — the bordered card the
// glass dialect presets vs the floating ink chit the ink dialect presets.
export type ToastStyle = 'card' | 'chit';

// Convenience aliases — the resolved palette shape for either mode. Both
// `light` and `dark` are structurally identical, so the union collapses to
// a single shape.
export type ColorPalette = typeof theme.colors.light;
