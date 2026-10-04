// components/MobilePremium/showcase/demos/ThemeAxesDemo.tsx
// The theme-axes playground — dev-only previewer that mutates the LIVE
// theme object so both languages of each render-read axis (atmosphere,
// toast) can be previewed in place. The declaration in constants/theme.ts
// stays the consumer's single point; this panel is a previewer, not a
// second declaration site, and everything resets on reload.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { theme } from '../../../../constants';
import { useAppTheme, useToast } from '../../../../context';
import { MobileSurface } from '../../MobileSurface';
import { SegmentedControl } from '../../SegmentedControl';
import { styles } from '../styles';

export function ThemeAxesDemo() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const [atmoStyle, setAtmoStyle] = useState(theme.atmosphere.style);
  const [toastStyle, setToastStyle] = useState(theme.toast.style);

  const axisRow = (label: string, value: string) => (
    <View key={label} style={styles.axisRow}>
      <Text style={[styles.axisLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.axisValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <MobileSurface>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 12 }]}>
        One declaration — theme.dialect — presets the whole surface-language family:
        atmosphere, drawer, toast, transition. Each axis can also be written literally
        for deliberately mixed taste. Live previews below; the rest of the panel reads
        the current declaration.
      </Text>

      {axisRow('theme.dialect', "'glass' — the starter preset")}
      {axisRow(
        'theme.drawer.style',
        `'${theme.drawer.style}' — both languages demo under Drawer below`,
      )}
      {axisRow(
        'theme.transition.style',
        `'${theme.transition.style}' — the curtain demo below drives the machinery directly`,
      )}
      {axisRow(
        'theme.shapes',
        `surface ${theme.shapes.surface} · sheet ${theme.shapes.sheet} · control ${theme.shapes.control} · tile ${theme.shapes.tile} · tag ${theme.shapes.tag === 999 ? '999 (round)' : theme.shapes.tag}`,
      )}
      {axisRow(
        'theme.fonts',
        theme.fonts.display != null || theme.fonts.mono != null
          ? 'declared — the printed-matter pair is live'
          : 'platform sans (declare display/mono for the poster/receipt pair)',
      )}

      <View style={styles.axisToggleRow}>
        <Text style={[styles.axisLabel, { color: colors.textMuted }]}>atmosphere</Text>
        {/* Bounded slot: the control fills its container width, so a row
            slot must flex it or the track overflows the card. */}
        <View style={styles.axisToggleControl}>
          <SegmentedControl
            variant="selection"
            segments={[
              { label: 'Aurora', value: 'aurora' },
              { label: 'Flat', value: 'flat' },
            ]}
            value={atmoStyle}
            onChange={(v: 'aurora' | 'flat') => {
              theme.atmosphere.style = v;
              setAtmoStyle(v);
            }}
            accessibilityLabel="Atmosphere language"
          />
        </View>
      </View>
      <Text style={[styles.axisHint, { color: colors.textMuted }]}>
        Watch the drifting orbs behind this page stop and start — every MobileAtmosphere
        follows the one declaration.
      </Text>

      <View style={styles.axisToggleRow}>
        <Text style={[styles.axisLabel, { color: colors.textMuted }]}>toast</Text>
        <View style={styles.axisToggleControl}>
          <SegmentedControl
            variant="selection"
            segments={[
              { label: 'Card', value: 'card' },
              { label: 'Chit', value: 'chit' },
            ]}
            value={toastStyle}
            onChange={(v: 'card' | 'chit') => {
              theme.toast.style = v;
              setToastStyle(v);
              showToast('success', `Toast surface: ${v === 'chit' ? 'the ink chit' : 'the bordered card'}.`);
            }}
            accessibilityLabel="Toast surface language"
          />
        </View>
      </View>
      <Text style={[styles.axisHint, { color: colors.textMuted }]}>
        The toggle emits a live toast — the ink chit is the announcement strip's strong
        tone, floating: ink plate, one status dot, receipt mono when fonts.mono is declared.
      </Text>

      <View style={[styles.axisRow, { marginTop: 14 }]}>
        <Text style={{ color: colors.brand, fontSize: 24, fontWeight: '800' }}>
          brand
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8, flex: 1 }}>
          fills, borders, display type (≥19px bold) — a 3:1 slot
        </Text>
      </View>
      <View style={styles.axisRow}>
        <Text style={{ color: colors.brandText, fontSize: 13, fontWeight: '700' }}>
          brandText
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8, flex: 1 }}>
          10–15px labels, eyebrows, links — the AA companion (a saturated brand darkens
          it in light mode until it clears 4.5:1)
        </Text>
      </View>
    </MobileSurface>
  );
}
