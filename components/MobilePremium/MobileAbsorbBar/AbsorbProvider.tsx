// components/MobilePremium/MobileAbsorbBar/AbsorbProvider.tsx
// The absorb provider — station registry + the rAF measurement engine +
// the bar's React-visible state. The absorbing top bar's home is the
// module index (./index.ts) — see there for the system's design notes.
//
// The measurement engine. Binds to the scrolling container (the app
// scrolls an inner div, not the window — discovered by walking up from
// any live station), re-measures on scroll/resize/content-resize, and
// eases every fill height toward its overlap target in one rAF loop.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppTheme } from '../../../context';
import { hasWindow, isWeb } from '../../../utils';
import { prefersReducedMotionSync } from '../../premium/shared';
import {
  type AbsorbContextValue,
  type AbsorbFillLayer,
  type AbsorbStationEntry,
  type AbsorbTone,
  AbsorbContext,
  EMPTY_TONE,
  nodeFrom,
} from './context';
import { yiq } from './colorMath';
import {
  DAMP_FALL_MS,
  DAMP_RISE_MS,
  DRIFT_A_MS,
  DRIFT_B_MS,
  HAIRLINE_AT,
  MASK_A,
  MASK_B,
  MASK_H,
  WAVE_A,
  WAVE_B,
  ensureAbsorbCss,
} from './waves';

export function AbsorbProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const [layers, setLayers] = useState<AbsorbFillLayer[]>([]);
  const [tone, setTone] = useState<AbsorbTone>(EMPTY_TONE);
  const [scrolled, setScrolled] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [clipExit, setClipExit] = useState(false);

  const barEl = useRef<HTMLElement | null>(null);
  const chromeClipA = useRef<HTMLElement | null>(null);
  const chromeClipB = useRef<HTMLElement | null>(null);
  const stationsRef = useRef<Map<string, AbsorbStationEntry> | null>(null);
  if (stationsRef.current == null) stationsRef.current = new Map();
  const stations = stationsRef.current;
  const layerElsRef = useRef<Map<string, HTMLElement> | null>(null);
  if (layerElsRef.current == null) layerElsRef.current = new Map();
  const layerEls = layerElsRef.current;

  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const bindRef = useRef<(() => void) | null>(null);

  const ping = useCallback(() => {
    bindRef.current?.();
  }, []);

  const attach = useCallback(
    (id: string, color: string, el: unknown) => {
      const node = nodeFrom(el);
      const existing = stations.get(id);
      if (existing != null) {
        existing.el = node;
        existing.color = color;
      } else {
        stations.set(id, { el: node, color, cur: 0, target: 0, exit: false, cardRadius: null, docked: false });
      }
      ping();
    },
    [stations, ping],
  );

  const detach = useCallback(
    (id: string) => {
      const entry = stations.get(id);
      if (entry != null) entry.el = null;
      ping();
    },
    [stations, ping],
  );

  const setStationColor = useCallback(
    (id: string, color: string) => {
      const entry = stations.get(id);
      if (entry != null && entry.color !== color) {
        entry.color = color;
        ping();
      }
    },
    [stations, ping],
  );

  const reportBarHeight = useCallback((h: number) => {
    setBarHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  const attachLayerEl = useCallback(
    (id: string, el: unknown) => {
      const node = nodeFrom(el);
      if (node != null) layerEls.set(id, node);
      else layerEls.delete(id);
    },
    [layerEls],
  );

  const attachChromeClip = useCallback((which: 'a' | 'b', el: unknown) => {
    const ref = which === 'a' ? chromeClipA : chromeClipB;
    ref.current = nodeFrom(el);
  }, []);

  useEffect(() => {
    if (!isWeb || !hasWindow()) return;
    if (process.env.NODE_ENV === 'test') return;
    ensureAbsorbCss();

    const reduced = prefersReducedMotionSync();
    let scroller: HTMLElement | Window = window;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let lastTs = 0;
    let zoneH = 0;
    let engagedFg: string | null = null;
    let engagedBg: string | null = null;
    let scrolledNow = false;
    let dominantId: string | null = null;
    let clipExitNow = false;
    // The mask copies' drifts must run in PHASE with the visible wave
    // strips. CSS animations start at mount, and the strips' mounts
    // (per station) never coincide with the clips' mounts (per
    // engagement) — an unaligned mask is x-shifted off its crest, and
    // the split line stops tracking the wave. Alignment SEEKS each
    // clip's running animation to its strip's live phase (Web
    // Animations currentTime — no restart, no jump), one frame after
    // the dominant flips so the new layer's elements exist, with a
    // bounded retry for late clip mounts.
    let maskLockId: string | null = null;
    const stripPhase = (strip: HTMLElement | null): number | null => {
      if (strip == null || typeof strip.getAnimations !== 'function') return null;
      for (const anim of strip.getAnimations()) {
        if (anim.playState !== 'running') continue;
        const t = Number(anim.currentTime);
        if (Number.isFinite(t)) return t;
      }
      return null;
    };
    const seekClip = (clip: HTMLElement, phase: number): void => {
      if (typeof clip.getAnimations !== 'function') return;
      for (const anim of clip.getAnimations()) {
        if (anim.playState !== 'running') continue;
        anim.currentTime = phase;
        return;
      }
    };
    const alignMasks = (stationId: string) => {
      const layer = layerEls.get(stationId);
      if (layer == null) return;
      const jobs = [
        [chromeClipA.current, WAVE_A.cls, DRIFT_A_MS],
        [chromeClipB.current, WAVE_B.cls, DRIFT_B_MS],
      ] as const;
      for (const [clip, waveCls, period] of jobs) {
        if (clip == null) continue;
        const box = Array.from(layer.children).find(
          (b) =>
            b.firstElementChild instanceof HTMLElement &&
            (b.firstElementChild as HTMLElement).classList.contains(waveCls),
        ) as HTMLElement | undefined;
        const stripEl = box?.firstElementChild;
        const phase =
          stripEl instanceof HTMLElement ? stripPhase(stripEl) : null;
        if (phase != null) seekClip(clip, phase % period);
      }
    };
    const scheduleMaskAlign = (stationId: string, tries = 0) => {
      window.requestAnimationFrame(() => {
        if (dominantId !== stationId) return;
        const ready =
          layerEls.get(stationId) != null &&
          chromeClipA.current != null &&
          chromeClipB.current != null;
        if (ready) alignMasks(stationId);
        else if (tries < 90) scheduleMaskAlign(stationId, tries + 1);
      });
    };

    // The readable companion of a fill: whichever of the palette's two
    // poles carries contrast against it (works in both modes — the
    // poles swap in dark, the math does not).
    const readableFg = (fill: string): string => {
      const c = colorsRef.current;
      const light = yiq(c.background) >= yiq(c.text) ? c.background : c.text;
      const dark = light === c.background ? c.text : c.background;
      return yiq(fill) < 150 ? light : dark;
    };

    const measure = () => {
      const bar = barEl.current;
      if (bar == null) return;
      const zr = bar.getBoundingClientRect();
      if (zr.height < 8) return;
      zoneH = zr.height;

      let dominantTarget = 0;
      const active = new Set<string>();
      for (const [id, s] of stations) {
        if (s.el == null) {
          s.target = 0;
        } else {
          const r = s.el.getBoundingClientRect();
          const oy = Math.min(zr.bottom, r.bottom) - Math.max(zr.top, r.top);
          const ox = Math.min(zr.right, r.right) - Math.max(zr.left, r.left);
          // Horizontal overlap is a gate, not a ratio: stations live in
          // the constrained content column while the bar runs full-bleed
          // (the plate language) — a card must fill the bar completely.
          s.target = oy > 0 && ox > 0 ? Math.min(1, oy / zr.height) : 0;
          // Exiting once the card's bottom edge rides into the zone —
          // the colour now connects UP to the card, so the fill hangs.
          s.exit = r.bottom < zr.bottom - 0.5;
        }
        // A station stays mounted while it has overlap OR its fill is
        // still draining.
        if (s.target > 0.004 || s.cur > 0.004) active.add(id);
        if (s.target > dominantTarget) {
          dominantTarget = s.target;
          dominantId = id;
        }
      }

      setLayers((prev) => {
        const next: AbsorbFillLayer[] = [];
        for (const [id, s] of stations) {
          if (active.has(id)) next.push({ id, color: s.color, exit: s.exit });
        }
        if (prev.length !== next.length) return next;
        for (let i = 0; i < next.length; i += 1) {
          if (
            prev[i].id !== next[i].id ||
            prev[i].color !== next[i].color ||
            prev[i].exit !== next[i].exit
          ) {
            return next;
          }
        }
        return prev;
      });

      // The chrome tone follows the dominant fill with no thresholds —
      // the overlay copy is clipped to the fill's own shape, so partial
      // coverage reads correctly by construction (the ripple splits the
      // letters; covered halves flip, uncovered halves stay ink).
      const dominant = dominantId != null ? stations.get(dominantId) ?? null : null;
      if (dominantId !== maskLockId) {
        maskLockId = dominantId;
        if (dominantId != null) scheduleMaskAlign(dominantId);
      }
      if (dominant != null && dominantTarget > 0.004) {
        const fg = readableFg(dominant.color);
        if (engagedFg !== fg || engagedBg !== dominant.color) {
          engagedFg = fg;
          engagedBg = dominant.color;
          setTone({ fg, bg: dominant.color });
        }
        if (clipExitNow !== dominant.exit) {
          clipExitNow = dominant.exit;
          setClipExit(dominant.exit);
        }
      } else if (engagedFg != null) {
        engagedFg = null;
        engagedBg = null;
        dominantId = null;
        setTone({ fg: null, bg: null });
      }

      const top = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
      const nextScrolled = top > HAIRLINE_AT;
      if (nextScrolled !== scrolledNow) {
        scrolledNow = nextScrolled;
        setScrolled(nextScrolled);
      }
    };

    const tick = (ts: number) => {
      const dt = lastTs > 0 ? Math.min(64, ts - lastTs) : 16.7;
      lastTs = ts;
      let moving = false;
      const dead: string[] = [];
      for (const [id, s] of stations) {
        // Liquid falls a touch faster than it rises — gravity in the
        // damping constant, nothing more.
        const damp = s.target < s.cur ? DAMP_FALL_MS : DAMP_RISE_MS;
        const k = reduced ? 1 : 1 - Math.exp(-dt / damp);
        const delta = s.target - s.cur;
        if (Math.abs(delta) > 0.0015) {
          s.cur += delta * k;
          moving = true;
        } else {
          s.cur = s.target;
        }
        // The drain's last drops snap home — an exponential tail would
        // linger as a sub-pixel sliver for another half-second.
        if (s.target === 0 && s.cur < 0.02) s.cur = 0;
        const node = layerEls.get(id);
        if (node != null && zoneH > 0) {
          const fillPx = Math.max(0, s.cur * zoneH);
          node.style.height = `${fillPx.toFixed(2)}px`;
          // The meniscus is born flat: every wave box squashes to the
          // fill's own height and grows its amplitude with it, so the
          // ripple creeps up from 0 at the point of contact.
          for (const child of Array.from(node.children)) {
            const box = child as HTMLElement;
            const boxH = box.offsetHeight || 1;
            box.style.transform = `scaleY(${Math.min(1, fillPx / boxH).toFixed(3)})`;
          }
        }
        // Docking corners: the card's colliding edge squares as it
        // submerges (riding the same damped liquid), reading as the card
        // merging into the bar's pool; released, the card's own radius
        // is restored. Written inline on the card element — clearing the
        // inline value falls back to its stylesheet radius.
        const cardEl =
          s.el != null && s.el.firstElementChild instanceof HTMLElement
            ? s.el.firstElementChild
            : null;
        if (cardEl != null) {
          if (s.cardRadius == null) {
            s.cardRadius =
              parseFloat(getComputedStyle(cardEl).borderTopLeftRadius) || 0;
          }
          const submerge = Math.min(1, s.cur * 1.8);
          if (submerge > 0.004) {
            const open = (s.cardRadius * (1 - submerge)).toFixed(2);
            const keep = s.cardRadius.toFixed(2);
            cardEl.style.borderRadius = s.exit
              ? `${keep}px ${keep}px ${open}px ${open}px`
              : `${open}px ${open}px ${keep}px ${keep}px`;
            s.docked = true;
          } else if (s.docked) {
            cardEl.style.borderRadius = '';
            s.docked = false;
          }
        }
        if (s.el == null && s.target === 0 && s.cur < 0.004) dead.push(id);
      }
      if (dead.length > 0) {
        for (const id of dead) stations.delete(id);
      }
      // The chrome's contrast copies are clipped to the visible INK
      // ENVELOPE — the fill plus the wave's overshoot above it (the
      // crest band crosses the letters; without it the base ink text
      // sits on ink wave with no paper copy over it and reads as the
      // wave painting in front of the text) — with each mask's wave
      // squashed to the same amplitude. One copy per wave spec; their
      // union is the true visible crest.
      const dom = dominantId != null ? stations.get(dominantId) : null;
      const clipA = chromeClipA.current;
      const clipB = chromeClipB.current;
      if ((clipA != null || clipB != null) && dom != null && zoneH > 0) {
        const fillPx = Math.max(0, dom.cur * zoneH);
        const envU = fillPx + Math.min(fillPx, MASK_H);
        const clipH = Math.min(zoneH, envU);
        for (const [clip, m] of [
          [clipA, MASK_A],
          [clipB, MASK_B],
        ] as const) {
          if (clip == null) continue;
          const km = Math.max(1, Math.min(m.height, fillPx));
          clip.style.height = `${clipH.toFixed(2)}px`;
          // Each mask band anchors where ITS wave's squashed box sits:
          // the fill's edge, one pixel of seam overlap, minus the
          // spec's own amplitude (the boxes overlap the fill by 1px and
          // the specs squash to different heights). Anchoring both
          // bands at the clip's top floated the shorter wave's mask
          // above its crest — the fill's colour riding the humps over
          // opaque chrome. At deep submersion the band rides past the
          // strip's edge with the visible meniscus, so no phantom wave
          // parks over the letters.
          const tileY = dom.exit ? fillPx - 1 : clipH - fillPx + 1 - km;
          const gradY = dom.exit ? 0 : Math.max(0, tileY + km);
          const gradH = Math.max(1, dom.exit ? Math.max(0, tileY) : clipH - gradY);
          const sizes = `${m.tile}px ${km.toFixed(2)}px,100% ${gradH.toFixed(2)}px`;
          clip.style.setProperty('mask-size', sizes, '');
          clip.style.setProperty('-webkit-mask-size', sizes, '');
          const pos = `${tileY.toFixed(2)}px,${gradY.toFixed(2)}px`;
          clip.style.setProperty('mask-position-y', pos, '');
          clip.style.setProperty('-webkit-mask-position-y', pos, '');
        }
      }
      raf = moving ? window.requestAnimationFrame(tick) : 0;
      if (!moving) {
        lastTs = 0;
        // A drained fill unmounts on the next measure — run it once
        // more when the liquid settles so empty layers never linger.
        measure();
      }
    };

    const kick = () => {
      if (raf === 0) {
        lastTs = 0;
        raf = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      measure();
      kick();
    };

    const bind = () => {
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      let found: HTMLElement | null = null;
      for (const s of stations.values()) {
        if (s.el == null) continue;
        let p: HTMLElement | null = s.el.parentElement;
        while (p != null && p !== document.body) {
          const oy = window.getComputedStyle(p).overflowY;
          if (oy === 'auto' || oy === 'scroll') {
            found = p;
            break;
          }
          p = p.parentElement;
        }
        break;
      }
      scroller = found ?? window;
      scroller.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      if (ro != null) {
        if (scroller instanceof HTMLElement) ro.observe(scroller);
        for (const s of stations.values()) {
          if (s.el != null) ro.observe(s.el);
        }
      }
      measure();
      kick();
    };
    bindRef.current = bind;

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => schedule());
    }

    bind();
    // The home feed staggers in (FadeIn transforms move the stations
    // without resizing them) — a few settle beats re-measure past it.
    const settle = [320, 780, 1400].map((ms) => window.setTimeout(schedule, ms));

    return () => {
      settle.forEach((t) => window.clearTimeout(t));
      if (raf !== 0) window.cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      bindRef.current = null;
    };
  }, [stations, layerEls, barEl]);

  const value = useMemo<AbsorbContextValue>(
    () => ({
      barEl,
      chromeClipEls: { a: chromeClipA, b: chromeClipB },
      stations,
      layerEls,
      layers,
      tone,
      scrolled,
      barHeight,
      clipExit,
      attach,
      detach,
      setStationColor,
      ping,
      reportBarHeight,
      attachLayerEl,
      attachChromeClip,
    }),
    [
      stations,
      layerEls,
      layers,
      tone,
      scrolled,
      barHeight,
      clipExit,
      attach,
      detach,
      setStationColor,
      ping,
      reportBarHeight,
      attachLayerEl,
      attachChromeClip,
    ],
  );

  return <AbsorbContext.Provider value={value}>{children}</AbsorbContext.Provider>;
}
