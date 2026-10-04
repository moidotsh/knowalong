// components/MobilePremium/MobileAbsorbBar/waves.ts
// The meniscus system — wave tiles, chrome masks, and the injected CSS.
// One seamless SVG wave tile per colour and phase, cached — the fill's
// leading edge is a water surface: two tiles at different wavelengths and
// drift speeds (pure CSS keyframes), the slower one at 65% so their crests
// interfere. Entering, the solid sits below the curve (crests rise into
// the paper above the fill); exiting, the tile flips — solid above the
// curve, crests hanging down toward the floor like the last drips.
import { type ViewStyle } from 'react-native';
import { DOM_IDS } from '../../../constants';

// ── Tuning ──────────────────────────────────────────────────────────────
// The rise is near-sticky (the fill meets the card's edge at first
// contact and stays on it — a slow liquid here reads as the colour
// popping in mid-bar); the fall stays viscous. Damping is time-based
// exponential, so the feel holds at 60 and 120Hz. The chrome has NO
// engage/release thresholds — the contrast copy is clipped to the
// fill's own shape, so half-covered text reads half-flipped by
// construction: the ripple splits the letters.
export const DAMP_RISE_MS = 34;
export const DAMP_FALL_MS = 62;
export const HAIRLINE_AT = 6;

export interface WaveSpec {
  tile: number;
  height: number;
  cls: string;
}

export const WAVE_A: WaveSpec = { tile: 112, height: 28, cls: 'arq-absorb-wave-a' };
export const WAVE_B: WaveSpec = { tile: 76, height: 20, cls: 'arq-absorb-wave-b' };
// One drift period per wave — the CSS durations and the engine's
// mask-phase lock read the same numbers.
export const DRIFT_A_MS = 3400;
export const DRIFT_B_MS = 5200;

const waveUriCache = new Map<string, string>();

function waveBackground(color: string, v: WaveSpec, flip: boolean): string {
  const key = `${v.tile}:${flip ? 'f' : 'n'}:${color}`;
  let uri = waveUriCache.get(key);
  if (uri == null) {
    const { tile: w, height: h } = v;
    const a = h / 2;
    const path = flip
      ? `M0 ${a} Q ${w / 4} ${h} ${w / 2} ${a} T ${w} ${a} L ${w} 0 L 0 0 Z`
      : `M0 ${a} Q ${w / 4} 0 ${w / 2} ${a} T ${w} ${a} L ${w} ${h} L 0 ${h} Z`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="${path}" fill="${color}"/></svg>`;
    uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    waveUriCache.set(key, uri);
  }
  return uri;
}

// The amplitude box — the wave's scale frame. The engine squashes it to
// the fill's own height every tick (scaleY, anchored at the seam), so
// the meniscus is born flat at first contact and grows its amplitude
// with the fill instead of arriving full-size.
export function waveBoxStyle(v: WaveSpec, flip: boolean): ViewStyle {
  const anchor = flip
    ? { bottom: -(v.height - 1), top: 'auto' as const }
    : { top: -(v.height - 1), bottom: 'auto' as const };
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    height: v.height,
    ...anchor,
  } as unknown as ViewStyle;
}

// The drift strip — the full-amplitude wave tile inside its scale frame,
// drifting horizontally on the CSS keyframes; flipped on exit so the
// crests hang down. background* are web-only CSS keys RN's ViewStyle
// doesn't declare (same cast pattern as the boot gradients).
export function waveStyle(color: string, v: WaveSpec, flip: boolean): ViewStyle {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '240%',
    backgroundImage: waveBackground(color, v, flip),
    backgroundRepeat: 'repeat-x',
    backgroundSize: `${v.tile}px 100%`,
  } as unknown as ViewStyle;
}

// The chrome clip's wave mask tiles — monochrome alpha (black below or
// above the curve, transparent elsewhere), the SAME curves and drift
// timings as the visible meniscus. TWO specs, one per visible wave tile:
// the meniscus is two counter-drifting curves and the chrome's mask must
// cover their UNION (the real visible crest) — a single-wave mask leaves
// the base copy showing through wherever the second wave crests above
// the first (an opposite-colour square through any opaque chrome). One
// CSS animation drives one mask-position-x, so each wave's mask rides
// its own masked copy of the chrome; their union is exact by
// construction.
const MASK_A = { tile: WAVE_A.tile, height: WAVE_A.height };
const MASK_B = { tile: WAVE_B.tile, height: WAVE_B.height };
// The envelope overshoot covers the TALLEST crest (wave A's).
const MASK_W = MASK_A.tile;
const MASK_H = MASK_A.height;
export { MASK_A, MASK_B, MASK_H };

function maskTile(w: number, h: number, flip: boolean): string {
  const a = h / 2;
  const path = flip
    ? `M0 ${a} Q ${w / 4} ${h} ${w / 2} ${a} T ${w} ${a} L ${w} 0 L 0 0 Z`
    : `M0 ${a} Q ${w / 4} 0 ${w / 2} ${a} T ${w} ${a} L ${w} ${h} L 0 ${h} Z`;
  // s7-exempt: mask alpha — never a rendered colour, only opacity composites.
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${path}" fill="#000"/></svg>`,
  );
}

const maskTileAEnter = maskTile(MASK_A.tile, MASK_A.height, false);
const maskTileAExit = maskTile(MASK_A.tile, MASK_A.height, true);
const maskTileBEnter = maskTile(MASK_B.tile, MASK_B.height, false);
const maskTileBExit = maskTile(MASK_B.tile, MASK_B.height, true);

export function ensureAbsorbCss(): void {
  if (document.getElementById(DOM_IDS.absorbCss) != null) return;
  const el = document.createElement('style');
  el.id = DOM_IDS.absorbCss;
  el.textContent = [
    `@keyframes arq-absorb-drift-a{from{transform:translateX(0)}to{transform:translateX(-${WAVE_A.tile}px)}}`,
    `@keyframes arq-absorb-drift-b{from{transform:translateX(-${WAVE_B.tile}px)}to{transform:translateX(0)}}`,
    `.${WAVE_A.cls}{animation:arq-absorb-drift-a ${DRIFT_A_MS}ms linear infinite}`,
    `.${WAVE_B.cls}{animation:arq-absorb-drift-b ${DRIFT_B_MS}ms linear infinite;opacity:.65}`,
    // The chrome contrast copy's clip: the fill's own waves as alpha
    // masks (tile + a solid field), each drifting in lockstep with its
    // visible wave. The engine writes mask-size and mask-position-y per
    // tick so each mask's wave squashes with the fill — born flat,
    // growing in. The solid field repeats in x: the drift keyframes
    // animate ONE mask-position-x value, which applies to EVERY layer —
    // a no-repeat field would slide off the clip's right edge with the
    // loop and bare the right-hand chrome to the base copy mid-fill.
    // Tiled, the 100%-wide field is x-phase-neutral.
    `.arq-absorb-mask-enter{-webkit-mask-image:url("data:image/svg+xml,${maskTileAEnter}"),linear-gradient(#000,#000);mask-image:url("data:image/svg+xml,${maskTileAEnter}"),linear-gradient(#000,#000);-webkit-mask-repeat:repeat-x,repeat-x;mask-repeat:repeat-x,repeat-x;animation:arq-absorb-mask-drift ${DRIFT_A_MS}ms linear infinite}`,
    `.arq-absorb-mask-exit{-webkit-mask-image:url("data:image/svg+xml,${maskTileAExit}"),linear-gradient(#000,#000);mask-image:url("data:image/svg+xml,${maskTileAExit}"),linear-gradient(#000,#000);-webkit-mask-repeat:repeat-x,repeat-x;mask-repeat:repeat-x,repeat-x;animation:arq-absorb-mask-drift ${DRIFT_A_MS}ms linear infinite}`,
    // Wave B's mask copy — same shape, its OWN drift (the visible B tile
    // runs 5.2s rightward, so the mask must too).
    `.arq-absorb-mask-b-enter{-webkit-mask-image:url("data:image/svg+xml,${maskTileBEnter}"),linear-gradient(#000,#000);mask-image:url("data:image/svg+xml,${maskTileBEnter}"),linear-gradient(#000,#000);-webkit-mask-repeat:repeat-x,repeat-x;mask-repeat:repeat-x,repeat-x;animation:arq-absorb-mask-drift-b ${DRIFT_B_MS}ms linear infinite}`,
    `.arq-absorb-mask-b-exit{-webkit-mask-image:url("data:image/svg+xml,${maskTileBExit}"),linear-gradient(#000,#000);mask-image:url("data:image/svg+xml,${maskTileBExit}"),linear-gradient(#000,#000);-webkit-mask-repeat:repeat-x,repeat-x;mask-repeat:repeat-x,repeat-x;animation:arq-absorb-mask-drift-b ${DRIFT_B_MS}ms linear infinite}`,
    `@keyframes arq-absorb-mask-drift{from{-webkit-mask-position-x:0;mask-position-x:0}to{-webkit-mask-position-x:-${MASK_W}px;mask-position-x:-${MASK_W}px}}`,
    `@keyframes arq-absorb-mask-drift-b{from{-webkit-mask-position-x:-${MASK_B.tile}px;mask-position-x:-${MASK_B.tile}px}to{-webkit-mask-position-x:0;mask-position-x:0}}`,
    '@media (prefers-reduced-motion:reduce){.arq-absorb-wave-a,.arq-absorb-wave-b,.arq-absorb-mask-enter,.arq-absorb-mask-exit,.arq-absorb-mask-b-enter,.arq-absorb-mask-b-exit{animation:none}}',
  ].join('');
  document.head.appendChild(el);
}
