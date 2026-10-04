// components/MobilePremium/showcase/demos/AbsorbBarDemo.tsx
// The absorbing top bar demo — a scroll container with coloured stations
// rising into a pinned strip. Web (dev) plays the liquid; jsdom/native
// render the inert static bar — the engine gates itself, the demo needs no
// environment check. AbsorbDemoChrome is the REFERENCE host-chrome
// pattern: the three-copy chrome (neutral base + two masked contrast
// copies) that the design doc's AbsorbBar row leans on.
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../../context';
import {
  AbsorbProvider,
  AbsorbTopBar,
  AbsorbSpacer,
  AbsorbStation,
  AbsorbChromeNeutral,
  useAbsorbBar,
  compositeWash,
} from '../../MobileAbsorbBar';
import { styles } from '../styles';
import { ABSORB_DEMO_BAR_H } from '../data';

function AbsorbDemoChrome() {
  const { colors } = useAppTheme();
  const absorb = useAbsorbBar();
  useEffect(() => {
    absorb.reportBarHeight(ABSORB_DEMO_BAR_H);
    // reportBarHeight is stable; the demo bar height is a constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The production host pattern, exercised for real: the chrome renders
  // THREE times — the neutral base copy (the readable one), plus two
  // inert contrast copies, each masked to one of the meniscus's two
  // counter-drifting waves. One CSS animation drives one
  // mask-position-x, so no single mask tracks both curves — the copies'
  // union is the visible crest, and the base copy never shows through
  // wherever the second wave crests above the first.
  const makeClipRef = (which: 'a' | 'b', base: string) => (el: View | null) => {
    absorb.attachChromeClip(which, el);
    if (typeof HTMLElement !== 'undefined' && el instanceof HTMLElement) {
      el.classList.remove(`${base}-enter`, `${base}-exit`);
      el.classList.add(absorb.clipExit ? `${base}-exit` : `${base}-enter`);
    }
  };
  const clipRefA = makeClipRef('a', 'arq-absorb-mask');
  const clipRefB = makeClipRef('b', 'arq-absorb-mask-b');
  const fg = absorb.tone.fg;
  const title = (color: string) => (
    <Text style={[styles.absorbChromeTitle, { color }]}>The bar drinks the page</Text>
  );
  return (
    <View style={styles.absorbChrome} pointerEvents="none">
      {/* The base copy — always neutral, always the readable one. */}
      <AbsorbChromeNeutral>{title(colors.text)}</AbsorbChromeNeutral>
      {/* The contrast copies — clipped to each wave's mask, inert.
          Identical renders: the union of their masks is what reads. */}
      {fg != null
        ? ([
            { which: 'a', ref: clipRefA, testID: 'absorb-demo-clip-a' },
            { which: 'b', ref: clipRefB, testID: 'absorb-demo-clip-b' },
          ] as const).map(({ which, ref, testID }) => (
            <View key={which} style={StyleSheet.absoluteFill} pointerEvents="none">
              <View
                testID={testID}
                ref={ref}
                style={[styles.absorbClip, absorb.clipExit ? styles.absorbClipExit : null]}
              >
                <View
                  style={
                    absorb.clipExit
                      ? styles.absorbClipContentExit
                      : styles.absorbClipContentEnter
                  }
                >
                  {title(fg)}
                </View>
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

export function AbsorbBarDemo() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.absorbDemo}>
      <AbsorbProvider>
        <ScrollView
          style={styles.absorbScroll}
          contentContainerStyle={styles.absorbContent}
          showsVerticalScrollIndicator={false}
        >
          <AbsorbSpacer />
          <AbsorbStation color={compositeWash(colors.brandMuted, colors.background)}>
            <View style={[styles.absorbCard, { backgroundColor: colors.brandMuted }]}>
              <Text style={[styles.absorbCardText, { color: colors.text }]}>
                An announcement wash — the strip's tint, composited over the
                page colour (what the bar absorbs is the colour the card READS,
                not the raw token).
              </Text>
            </View>
          </AbsorbStation>
          <AbsorbStation color={colors.text}>
            <View style={[styles.absorbCard, { backgroundColor: colors.text }]}>
              <Text style={[styles.absorbCardText, { color: colors.background }]}>
                An ink plate — the fill owns the row and the chrome flips to its
                readable companion as the ripple splits the letters.
              </Text>
            </View>
          </AbsorbStation>
          <AbsorbStation color={colors.brand}>
            <View style={[styles.absorbCard, { backgroundColor: colors.brand }]}>
              <Text style={[styles.absorbCardText, { color: colors.textOnBrand }]}>
                A brand card — docking corners square as the card submerges into
                the pool, and restore as it leaves.
              </Text>
            </View>
          </AbsorbStation>
          <AbsorbStation color={colors.card}>
            <View style={[styles.absorbCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.absorbCardText, { color: colors.text }]}>
                A plain paper card — no station, no fill; scroll it through and
                the strip returns to the page's paper.
              </Text>
            </View>
          </AbsorbStation>
          <View style={styles.absorbTail} />
        </ScrollView>
        <AbsorbTopBar />
        <AbsorbDemoChrome />
      </AbsorbProvider>
    </View>
  );
}
