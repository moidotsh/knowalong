// components/MobilePremium/MobileNavDrawer.tsx
// Left-side hamburger drawer for mobile navigation. The shell-level
// mechanism (slide / scrim / items / active-highlight / badge) — consumers
// pass their own items list, plus optional header (brand slot, slideout
// mode only) and footer (sign-out slot). Domain branding lives in those
// slots; this primitive carries none.
//
// Brand persistence modes (brandPersistence prop):
//   • 'slideout' (default): panel covers full screen height; brand lives
//     in the `header` slot. The home header is covered while the drawer
//     is open. Use when the home header is small or doesn't carry critical
//     context.
//   • 'cutout': panel + scrim start below the home header so the brand
//     and hamburger (which the consumer swaps to X) stay visible at the
//     same position. The `header` prop is ignored. The consumer's home
//     header must render at the same x/y position so the brand persists
//     visually as the drawer slides.
//
// Premium signals:
//   • Slides in from the left with an iOS-sheet curve
//     (cubic-bezier(0.32, 0.72, 0, 1)). The scrim behind crossfades.
//   • Drawer body uses MobileAtmosphere so consumers pick the palette.
//   • Active row gets a 3px brand strip on the left edge + brand-tinted
//     background + bolder label. Inactive rows render the icon at 55%
//     opacity so the active item pops without a color shift.
//   • prefers-reduced-motion collapses the slide to instant and the
//     scrim to a short fade — the drawer still works, just without motion.
//   • Tapping the scrim or any item calls onClose() after the press
//     handler runs. Drawer state is fully controlled by the consumer.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context';
import { useReducedMotion } from '../../hooks';
import { isWeb } from '../../utils';
import { usePressedStyle } from '../premium/shared';
import { MobileAtmosphere, type MobileAtmosphereSurface } from './MobileAtmosphere';

export interface MobileNavDrawerItem {
  /** Stable id; typically the route pathname (used for active match). */
  id: string;
  /** Display label. */
  label: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional count badge. Hidden when 0 / undefined. */
  badge?: number;
  /** Tap handler. Drawer closes after this fires. */
  onPress: () => void;
}

export type NavDrawerBrandPersistence = 'cutout' | 'slideout';

export type NavDrawerAnchor = 'window' | 'column';

export interface MobileNavDrawerProps {
  /** Whether the drawer is open (controlled). */
  open: boolean;
  /** Close handler. Fires on scrim tap, item tap, or external dismiss. */
  onClose: () => void;
  /** Nav items. */
  items: MobileNavDrawerItem[];
  /** Pathname of the active route, used to highlight the matching item. */
  activePathname?: string;
  /**
   * Optional element rendered at the top of the drawer (brand slot).
   * Ignored when brandPersistence is 'cutout' — the home header shows
   * through the transparent gap at the top of the panel instead.
   */
  header?: React.ReactNode;
  /** Optional element rendered at the bottom (sign-out slot, etc.). */
  footer?: React.ReactNode;
  /** Atmosphere surface for the drawer body (default: 'primary'). */
  atmosphere?: MobileAtmosphereSurface;
  /**
   * How the brand area is handled when the drawer is open.
   * - 'slideout' (default): panel covers full screen height; brand lives
   *   in the `header` slot.
   * - 'cutout': panel + scrim start below the home header; brand shows
   *   through the transparent gap at the top.
   * See file header for the full pattern comparison.
   */
  brandPersistence?: NavDrawerBrandPersistence;
  /**
   * Override the transparent cutout height at the top of the panel
   * (cutout mode only). Defaults to insets.top + 76 to match
   * MobileHomeHeader with subtitle. Size to match your home header if
   * it diverges.
   */
  cutoutHeight?: number;
  /**
   * Where the panel slides in from on wide viewports.
   * - 'window' (default): panel's resting position is x=0 of the
   *   window. On wide desktop the drawer appears detached from the
   *   centered 420pt column.
   * - 'column': panel's resting position is the left edge of the
   *   centered 420pt column (computed from useWindowDimensions), so
   *   the drawer stays attached to centered content on any viewport.
   *   On narrow viewports the two modes converge.
   */
  anchor?: NavDrawerAnchor;
  /**
   * Override the centered column width the 'column' anchor computes
   * against. Defaults to 420 (matches the body maxWidth on every
   * MobilePremium screen).
   */
  columnWidth?: number;
  /** Test ID. */
  testID?: string;
}

const DRAWER_WIDTH = 304;

// Overlay base. On web the overlay uses `position: fixed` so the drawer
// escapes any centered-column constraint applied to its parent (e.g. the
// root Stack's contentStyle spreading SCREEN_BODY_STYLE — maxWidth: 420,
// alignSelf: 'center'). With `absolute`, the overlay would inherit the
// 420pt column and the panel's `translateX(columnLeft)` would land past
// the column's right edge. `fixed` ties the overlay to the viewport so
// the column-anchor math resolves against the real window width.
// Native keeps `absolute` because the screen root is already full-bleed
// there and RN Modal semantics differ. The cast is required because RN's
// TS type for `position` narrows to 'static' | 'absolute' | 'relative';
// RN Web's runtime accepts 'fixed' (mirrors CSS) but its type augment
// isn't picked up here.
const overlayBase: ViewStyle = isWeb
  ? ({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    } as unknown as ViewStyle)
  : { ...StyleSheet.absoluteFillObject };

/**
 * Mobile navigation drawer. Slides in from the left with a glass scrim.
 * Shell-level mechanism only — branding, items, and footer are all
 * consumer-supplied.
 */
export function MobileNavDrawer({
  open,
  onClose,
  items,
  activePathname,
  header,
  footer,
  atmosphere = 'analytics',
  brandPersistence = 'slideout',
  cutoutHeight,
  anchor = 'window',
  columnWidth = 420,
  testID,
}: MobileNavDrawerProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pressedStyle = usePressedStyle();
  const { width: windowWidth } = useWindowDimensions();

  // In 'column' mode the panel's resting (open) position is the left
  // edge of the centered column, so the drawer stays attached to the
  // 420pt content on any viewport. On windows narrower than the column
  // the offset collapses to 0 and the two anchor modes converge.
  const columnLeft = Math.max(0, (windowWidth - columnWidth) / 2);
  const anchorOffset = anchor === 'column' ? columnLeft : 0;

  // In cutout mode the panel + scrim start below the home header so the
  // brand shows through. Default height matches MobileHomeHeader's brand
  // row only (safe-area top + 8 padding + 36 brand row = insets.top + 44).
  // The subtitle sits below the cutout and is covered by the opaque panel
  // surface — that's the intended "subtitle hides when drawer opens"
  // behavior. Override via cutoutHeight when the home header diverges.
  const isCutout = brandPersistence === 'cutout';
  const effectiveCutoutHeight = isCutout
    ? (cutoutHeight ?? insets.top + 44)
    : 0;

  // Mount + animate state. The drawer renders in the tree while open OR
  // while an exit animation is in flight; `shouldRender` gates the render
  // and `animatedIn` drives the slide.
  const [shouldRender, setShouldRender] = useState(false);
  const [animatedIn, setAnimatedIn] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Motion timings. Reduced motion collapses the slide to instant and
  // the scrim to a short fade. Unmount delay = max(slide, scrim) so the
  // exit animation completes before the component leaves the tree.
  const slideDuration = reduced ? 0 : 300;
  const scrimDuration = reduced ? 150 : 250;
  const unmountDelay = Math.max(slideDuration, scrimDuration);
  // iOS sheet curve — fast start, smooth deceleration.
  const slideEasing = 'cubic-bezier(0.32, 0.72, 0, 1)';

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      // Double-rAF so the initial state (translateX(-100%)) lands before
      // the transition kicks in — otherwise the drawer pops in fully
      // visible and slides out, which reads as a glitch.
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatedIn(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
    setAnimatedIn(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, unmountDelay);
  }, [open, unmountDelay]);

  // Clean up any pending unmount timer on tear-down.
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  if (!shouldRender) return null;

  const isActive = (id: string) => {
    if (id === '/') {
      return activePathname === '/' || activePathname === '' || activePathname == null;
    }
    if (activePathname == null) return false;
    // startsWith so nested routes (e.g. /items/123) highlight
    // their parent item.
    return activePathname === id || activePathname.startsWith(`${id}/`);
  };

  const accent = colors.brand;

  return (
    <View style={styles.overlay} testID={testID} pointerEvents="box-none">
      {/* Glass scrim — taps dismiss the drawer. In cutout mode the scrim
          starts below the home header so the brand stays fully bright. */}
      <Pressable
        onPress={onClose}
        style={[
          styles.scrim,
          {
            backgroundColor: `${colors.backgroundDeep}cc`,
            opacity: animatedIn ? 1 : 0,
            ...(isCutout ? { top: effectiveCutoutHeight } : null),
            ...(isWeb
              ? {
                  transition: `opacity ${scrimDuration}ms ease`,
                }
              : null),
          },
        ]}
      />

      {/* Drawer panel — slides from left. In cutout mode the panel is
          transparent in the brand area (the cutout) with just a right
          hairline to visually match the panel's right edge; the opaque
          surface starts below the cutout so the subtitle (which lives
          below the brand row on the home header) is covered while the
          brand + hamburger stay visible. In slideout mode the panel is
          opaque everywhere and the brand lives in the header slot. */}
      <Animated.View
        pointerEvents={isCutout ? 'box-none' : 'auto'}
        style={[
          styles.panel,
          {
            width: DRAWER_WIDTH,
            backgroundColor: isCutout ? 'transparent' : colors.backgroundDeep,
            borderRightColor: colors.mobilePremium.hairlineBorder,
            // Closed: translateX(-DRAWER_WIDTH) → panel off-screen left.
            // Open: translateX(anchorOffset) → panel at the column's
            // left edge in 'column' mode, or x=0 in 'window' mode.
            transform: [{ translateX: animatedIn ? anchorOffset : -DRAWER_WIDTH }],
            ...(isWeb
              ? {
                  transition: `transform ${slideDuration}ms ${slideEasing}`,
                }
              : null),
          },
        ]}
      >
        {isCutout ? (
          // Cutout cap — empty frame at the top of the panel. No fill, no
          // borders of its own; the home header brand shows through and
          // the panel's own borderRight (below) runs the full height for
          // visual continuity between cap and body. Slides with the panel
          // because it's a child of it. pointerEvents: none so taps reach
          // the hamburger behind it.
          <View
            pointerEvents="none"
            style={[styles.cutoutCap, { width: DRAWER_WIDTH, height: effectiveCutoutHeight }]}
          />
        ) : null}

        {/* Opaque surface + atmosphere + tint. In cutout mode this layer
            starts below the cap so the brand area stays clear. In slideout
            mode it fills the whole panel. */}
        <View
          pointerEvents="none"
          style={[
            styles.panelBackground,
            isCutout ? { top: effectiveCutoutHeight } : null,
            { backgroundColor: colors.backgroundDeep },
          ]}
        >
          <MobileAtmosphere surface={atmosphere} />
          <View
            style={[styles.panelTint, { backgroundColor: `${colors.backgroundDeep}99` }]}
          />
        </View>

        <View
          style={[
            styles.panelContent,
            isCutout ? { paddingTop: effectiveCutoutHeight } : null,
          ]}
          pointerEvents={isCutout ? 'box-none' : 'auto'}
        >
          {isCutout ? null : header ? (
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>{header}</View>
          ) : (
            <View style={{ height: insets.top + 12 }} />
          )}

          <View style={styles.items}>
            {items.map((item) => {
              const active = isActive(item.id);
              const showBadge = item.badge != null && item.badge > 0;
              return (
                <View key={item.id} style={styles.itemWrap}>
                  {/* Left accent strip — visible only on the active item. */}
                  <View
                    style={[
                      styles.activeStrip,
                      { backgroundColor: accent, opacity: active ? 1 : 0 },
                    ]}
                    pointerEvents="none"
                  />
                  <Pressable
                    onPress={() => {
                      item.onPress();
                      onClose();
                    }}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      styles.item,
                      { backgroundColor: active ? `${accent}1a` : 'transparent' },
                      pressed ? pressedStyle : null,
                    ]}
                  >
                    {item.icon ? (
                      <View style={[styles.itemIcon, { opacity: active ? 1 : 0.55 }]}>
                        {item.icon}
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.itemLabel,
                        {
                          color: active ? accent : colors.text,
                          fontWeight: active ? '600' : '400',
                          opacity: active ? 1 : 0.85,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {showBadge ? (
                      <View
                        style={[styles.badge, { backgroundColor: accent }]}
                        pointerEvents="none"
                      >
                        <Text style={[styles.badgeText, { color: colors.textOnBrand }]}>
                          {item.badge! > 99 ? '99+' : item.badge}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...overlayBase,
    zIndex: 100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
    // Right hairline runs the full panel height. In cutout mode this is
    // the only edge defining the cutout area; in slideout mode it adds
    // a subtle separation between the panel and the scrim beside it.
    borderRightWidth: 1,
  },
  cutoutCap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  panelBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  panelTint: {
    ...StyleSheet.absoluteFillObject,
  },
  panelContent: {
    flex: 1,
    position: 'relative',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  items: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  itemWrap: {
    position: 'relative',
  },
  activeStrip: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    left: 0,
    width: 3,
    borderRadius: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 42,
  },
  itemIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default MobileNavDrawer;
