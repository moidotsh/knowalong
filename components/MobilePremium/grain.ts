// components/MobilePremium/grain.ts
//
// The paper's tooth — a whisper of print noise for ink surfaces (a hero
// poster, a membership plate, a receipt card — anything rendered in the
// mode's `colors.text` rather than the paper cards). Pure SVG turbulence
// as a data URI at ~5% opacity: flat air holds, the surface just stops
// reading as a screen and starts reading as stock. InkPanel layers this
// same grain internally; the helpers here expose it to consumer-built
// ink surfaces that are not the whole panel.

/**
 * The ink-surface style layer: token background + grain. Returned from a
 * function (not a fresh literal at the call site) because RN's ViewStyle
 * type doesn't declare `backgroundImage` — RN-web renders it fine, the
 * type just doesn't know. Spread onto a View whose background color is
 * the mode's ink (`colors.text`); never tint the grain itself.
 */
export const inkSurface = (backgroundColor: string) =>
  ({
    backgroundColor,
    backgroundImage: INK_GRAIN_BACKGROUND,
  }) as unknown as import('react-native').ViewStyle;

/** Print-noise overlay for inverted (ink) surfaces — web-rendered, ~5% opacity. */
export const INK_GRAIN_BACKGROUND =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.05'/></svg>\")";
