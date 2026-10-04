// components/MobilePremium/MobileAbsorbBar/parts.tsx
// The body-side pieces — the neutralizing sub-provider, the backdrop
// strip, the spacer, the station wrapper, and the read hooks.
import React, { useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../../context';
import { hasWindow, isWeb } from '../../../utils';
import {
  type AbsorbContextValue,
  AbsorbContext,
  EMPTY_TONE,
  nodeFrom,
  useAbsorb,
} from './context';
import { WAVE_A, WAVE_B, waveBoxStyle, waveStyle } from './waves';

/**
 * Neutralizes the absorb tone for a subtree — the host wraps the BASE
 * chrome copy in it (always ink), while the clipped contrast copy above
 * reads the live tone. Without a provider it renders children as-is.
 */
export function AbsorbChromeNeutral({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AbsorbContext);
  const neutral = useMemo<AbsorbContextValue | null>(
    () => (ctx == null ? null : { ...ctx, tone: EMPTY_TONE }),
    [ctx],
  );
  if (neutral == null) return <>{children}</>;
  return <AbsorbContext.Provider value={neutral}>{children}</AbsorbContext.Provider>;
}

// ── The backdrop strip ──────────────────────────────────────────────────
// Full-bleed, pinned under the masthead (z10): the neutral paper, the
// fill layers, the scrolled hairline. Purely decorative — it never
// takes a pointer, and screen readers skip it.
export function AbsorbTopBar() {
  const absorb = useAbsorb();
  const { colors } = useAppTheme();
  // The page's top strip carries the atmosphere's vignette (an inset
  // shadow from the screen edges) — an opaque bar over it reads as a
  // slightly different shade. The bar clones the vignette at viewport
  // geometry (clipped to the strip by the bar's own overflow) so its
  // neutral rest state is pixel-identical to the page beneath.
  const [vignetteH, setVignetteH] = useState(0);
  useEffect(() => {
    if (!isWeb || !hasWindow()) return;
    if (process.env.NODE_ENV === 'test') return;
    const read = () => setVignetteH(window.innerHeight);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const setBarRef = useCallback(
    (el: unknown) => {
      absorb.barEl.current = nodeFrom(el);
    },
    [absorb],
  );

  const waveClass = useCallback((cls: string) => {
    return (el: unknown) => {
      nodeFrom(el)?.classList.add(cls);
    };
  }, []);

  return (
    <View
      testID="absorb-bar"
      ref={setBarRef}
      style={[
        styles.bar,
        { backgroundColor: colors.backgroundDeep },
        absorb.barHeight > 0 ? { height: absorb.barHeight } : null,
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {vignetteH > 0 ? (
        <View
          testID="absorb-bar-vignette"
          style={[
            styles.vignetteClone,
            { height: vignetteH, boxShadow: colors.mobilePremium.atmosphereVignette },
          ]}
          pointerEvents="none"
        />
      ) : null}
      {absorb.layers.map((layer) => (
        <View
          key={layer.id}
          ref={(el) => absorb.attachLayerEl(layer.id, el)}
          style={[
            styles.fill,
            { backgroundColor: layer.color },
            layer.exit ? styles.fillExit : null,
          ]}
          pointerEvents="none"
        >
          {([WAVE_B, WAVE_A] as const).map((v) => (
            <View
              key={v.cls}
              style={[
                waveBoxStyle(v, layer.exit),
                { transformOrigin: layer.exit ? 'top' : 'bottom' },
              ]}
              pointerEvents="none"
            >
              <View
                ref={waveClass(v.cls)}
                style={waveStyle(layer.color, v, layer.exit)}
                pointerEvents="none"
              />
            </View>
          ))}
        </View>
      ))}
      {absorb.scrolled ? (
        <View
          style={[styles.hairline, { backgroundColor: colors.cardBorder }]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

// ── The body-side pieces ────────────────────────────────────────────────

/** The top-of-body spacer holding the first card below the pinned bar. */
export function AbsorbSpacer() {
  const { barHeight } = useAbsorb();
  return <View style={{ height: barHeight }} pointerEvents="none" collapsable={false} />;
}

/**
 * Registers a coloured surface as a station. Wrap the card; the fill
 * adopts `color` as the bar absorbs it. Theme tokens only (S7).
 */
export function AbsorbStation({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const { attach, detach, setStationColor } = useAbsorb();
  const attachRef = useCallback(
    (el: unknown) => attach(id, color, el),
    [attach, id, color],
  );
  useEffect(() => () => detach(id), [detach, id]);
  useEffect(() => {
    setStationColor(id, color);
  }, [setStationColor, id, color]);
  return (
    <View ref={attachRef} testID="absorb-station" style={styles.station} collapsable={false}>
      {children}
    </View>
  );
}

/** Readable chrome colour while a fill owns the row; null at rest. */
export function useAbsorbFg(): string | null {
  return useAbsorb().tone.fg;
}

/** The full bar context — the header host reads height + tone. */
export function useAbsorbBar(): AbsorbContextValue {
  return useAbsorb();
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
  },
  // Exit phase: the fill hangs from the bar's top edge, connected to the
  // card riding out above — its meniscus (and drips) point to the floor.
  fillExit: {
    top: 0,
    bottom: 'auto',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  // Screen-geometry canvas for the atmosphere's vignette — absolute to
  // the bar's top-left corner, which IS the screen's; the bar's overflow
  // clips it to the strip so the inset shadow lands exactly where the
  // page's own vignette would.
  vignetteClone: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  station: {
    width: '100%',
  },
});
