// components/MobilePremium/MobileAbsorbBar/index.ts
// The absorbing top bar — the home header drinks the page. The bar is a
// paper strip pinned over the top of the scroll (the masthead rides a
// transparent layer above it); the strong surfaces below register as
// STATIONS (an announcement strip's wash, an ink hero plate, a brand
// card, a plain paper card), and as one crosses the bar its
// colour rises into the strip like dye into water: a damped fill height
// with a live wavy meniscus (two SVG wave tiles drifting at different
// speeds), the chrome flipping to its readable companion as the fill
// takes the row. Entering, the colour connects DOWN to the card below —
// the fill rises from the bar's floor; exiting, the card rides out above
// and the fill hangs from the bar's top, meniscus flipped, its crests
// dripping toward the floor. When a station leaves, the strip is the
// page's paper again — the background that runs between the elements,
// which is what it already renders at rest (backgroundDeep, the
// atmosphere's base tint).
//
// Geometry is DOM-only, so the motion is web-only (jsdom collapses to
// the inert static bar; native keeps the overlay layout with a plain
// paper strip — no measurement engine). Fill heights are written
// straight to the layer nodes from a rAF loop, so scrolling never
// re-renders React: only layer mount/unmount, phase flips, the tone
// flip, and the scrolled hairline are state. Ink dialect throughout —
// flat fills, no shadows, no gradients.
//
// Module map: colorMath (pure colour math) · waves (SVG tiles, masks,
// injected CSS) · context (types + idle default) · AbsorbProvider
// (registry + rAF engine) · parts (bar strip, spacer, station, hooks).

export { AbsorbProvider } from './AbsorbProvider';
export {
  AbsorbChromeNeutral,
  AbsorbTopBar,
  AbsorbSpacer,
  AbsorbStation,
  useAbsorbFg,
  useAbsorbBar,
} from './parts';
export { compositeWash, dimmedOver } from './colorMath';
export type { AbsorbFillLayer, AbsorbTone } from './context';
