// components/MobilePremium/MobileAbsorbBar/context.ts
// The absorb context — types, the provider-less idle default, and the
// DOM-node guard shared by every piece of the system.
import { createContext, useContext } from 'react';

export interface AbsorbStationEntry {
  el: HTMLElement | null;
  color: string;
  /** Damped fill fraction 0..1 — engine-owned, never React state. */
  cur: number;
  /** Measured overlap target 0..1. */
  target: number;
  /**
   * Transit phase: entering (the colour connects DOWN to the card below
   * the bar — the fill rises) or exiting (the card is above — the fill
   * hangs from it, meniscus dripping toward the floor). Flips exactly
   * when the card's bottom edge crosses the bar's bottom, i.e. at full
   * fill, so the swap is seamless.
   */
  exit: boolean;
  /** The card's own corner radius, cached at first dock (0 = square). */
  cardRadius: number | null;
  /** True while the docking corners are written inline. */
  docked: boolean;
}

export interface AbsorbFillLayer {
  id: string;
  color: string;
  exit: boolean;
}

export interface AbsorbTone {
  /** Readable chrome colour while a fill owns the row; null = neutral. */
  fg: string | null;
  /** The owning fill's own colour — chrome with an opaque ground (the
   *  language pill) paints IT, not transparency: the base copy's ground
   *  would otherwise show through under the contrast copy. */
  bg: string | null;
}

export interface AbsorbContextValue {
  /** The backdrop strip element — the overlap zone the engine measures. */
  barEl: React.MutableRefObject<HTMLElement | null>;
  /** The chrome contrast copies' clip nodes — engine-written heights.
   *  Two copies, one per wave's mask; their union is the visible crest. */
  chromeClipEls: {
    a: React.MutableRefObject<HTMLElement | null>;
    b: React.MutableRefObject<HTMLElement | null>;
  };
  /** Live station registry (engine-owned). */
  stations: Map<string, AbsorbStationEntry>;
  /** Fill layer nodes, written to directly by the rAF loop. */
  layerEls: Map<string, HTMLElement>;
  /** Mounted fill layers. */
  layers: AbsorbFillLayer[];
  /** Chrome tone while a station's fill owns the row. */
  tone: AbsorbTone;
  /** True once the page has scrolled off its rest position. */
  scrolled: boolean;
  /** The measured masthead height (the body spacer's source). */
  barHeight: number;
  /** The dominant fill's transit phase — clips the chrome copy. */
  clipExit: boolean;
  attach(id: string, color: string, el: unknown): void;
  detach(id: string): void;
  setStationColor(id: string, color: string): void;
  ping(): void;
  reportBarHeight(h: number): void;
  attachLayerEl(id: string, el: unknown): void;
  attachChromeClip(which: 'a' | 'b', el: unknown): void;
}

export const EMPTY_TONE: AbsorbTone = { fg: null, bg: null };

// The provider-less default (cart buttons and pills on screens that
// never mount a bar) — every member is a no-op or a rest value.
const IDLE_CONTEXT: AbsorbContextValue = {
  barEl: { current: null },
  chromeClipEls: { a: { current: null }, b: { current: null } },
  stations: new Map(),
  layerEls: new Map(),
  layers: [],
  tone: EMPTY_TONE,
  scrolled: false,
  barHeight: 0,
  clipExit: false,
  attach: () => {},
  detach: () => {},
  setStationColor: () => {},
  ping: () => {},
  reportBarHeight: () => {},
  attachLayerEl: () => {},
  attachChromeClip: () => {},
};

const AbsorbContext = createContext<AbsorbContextValue | null>(null);

export function useAbsorb(): AbsorbContextValue {
  return useContext(AbsorbContext) ?? IDLE_CONTEXT;
}

// ── Small DOM helpers ───────────────────────────────────────────────────
// RN views pass their host node on web; native passes class instances
// for which HTMLElement does not exist — one guard covers both.
const HAS_HTML_ELEMENT = typeof HTMLElement !== 'undefined';

export function nodeFrom(el: unknown): HTMLElement | null {
  return HAS_HTML_ELEMENT && el instanceof HTMLElement ? el : null;
}

export { AbsorbContext };
