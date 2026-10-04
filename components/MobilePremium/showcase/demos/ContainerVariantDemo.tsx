// components/MobilePremium/showcase/demos/ContainerVariantDemo.tsx
// useContainerVariant probe — three containers at different aspect ratios,
// each reporting its detected variant.
import { useRef } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useContainerVariant } from '../../../../hooks';
import { useAppTheme } from '../../../../context';
import { MobileSurface } from '../../MobileSurface';
import { styles } from '../styles';

export function ContainerVariantDemo() {
  const { colors } = useAppTheme();
  const refA = useRef(null);
  const refB = useRef(null);
  const refC = useRef(null);
  const a = useContainerVariant(refA, 'default');
  const b = useContainerVariant(refB, 'default');
  const c = useContainerVariant(refC, 'default');

  const samples: Array<{
    label: string;
    ref: React.RefObject<unknown>;
    style: ViewStyle;
    reading: { variant: string; fixedHeight: number; width: number; height: number };
  }> = [
    {
      label: 'wide & short → compact',
      ref: refA,
      style: { width: '100%', height: 28 },
      reading: a,
    },
    {
      label: 'balanced → medium',
      ref: refB,
      style: { width: '66%', height: 56 },
      reading: b,
    },
    {
      label: 'tall & narrow → full',
      ref: refC,
      style: { width: '40%', height: 110 },
      reading: c,
    },
  ];

  return (
    <View>
      <MobileSurface>
        {samples.map((s) => (
          <View key={s.label} style={styles.variantRow}>
            <View
              ref={s.ref as React.RefObject<View>}
              style={[styles.variantProbe, s.style, { backgroundColor: colors.brandMuted }]}
            />
            <View style={styles.variantMeta}>
              <Text style={[styles.bodyText, { color: colors.text }]}>{s.label}</Text>
              <Text style={[styles.animLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                variant: {s.reading.variant} · fixedHeight: {s.reading.fixedHeight}px · measured:{' '}
                {s.reading.width.toFixed(0)}×{s.reading.height.toFixed(0)}
              </Text>
            </View>
          </View>
        ))}
      </MobileSurface>
    </View>
  );
}
