// components/MobilePremium/showcase/demos/SkeletonDemo.tsx
// SkeletonBlock + useShimmer — loading placeholders in three shapes.
import { Text, View } from 'react-native';
import { useAppTheme } from '../../../../context';
import { MobileSurface } from '../../MobileSurface';
import { SkeletonBlock } from '../../SkeletonBlock';
import { styles } from '../styles';

/**
 * SkeletonBlock + useShimmer demo. Three variants — a full-width bar, a
 * short bar, and a circular avatar placeholder — plus a stacked avatar+
 * two-line composition. The shimmer pulse is the live useShimmer output;
 * under `prefers-reduced-motion: reduce` the blocks render as flat
 * `colors.cardAlt` rectangles with no animation.
 */
export function SkeletonDemo() {
  const { colors } = useAppTheme();
  return (
    <View>
      <MobileSurface>
        <SkeletonBlock height={16} />
        <View style={{ height: 12 }} />
        <SkeletonBlock width="60%" height={16} />
      </MobileSurface>
      <View style={styles.spacer} />
      <MobileSurface>
        <View style={styles.skeletonAvatarRow}>
          <SkeletonBlock width={48} height={48} borderRadius={24} />
          <View style={styles.skeletonAvatarMeta}>
            <SkeletonBlock width="80%" height={14} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="50%" height={12} />
          </View>
        </View>
      </MobileSurface>
      <Text style={[styles.animLabel, { color: colors.textSecondary, marginTop: 12 }]}>
        useShimmer pulses 1.0 → 0.5 → 1.0 over 1200ms via Animated.loop;
        collapses to a flat placeholder under prefers-reduced-motion: reduce.
      </Text>
    </View>
  );
}
