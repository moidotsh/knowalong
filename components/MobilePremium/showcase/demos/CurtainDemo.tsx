// components/MobilePremium/showcase/demos/CurtainDemo.tsx
// theme.transition.style = 'curtain' (the ink dialect's preset) plays this
// on every navigation in the real app; under the starter's 'none' the
// overlay never mounts. The buttons drive the machinery directly so the
// move is visible under any theme.
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAppTheme } from '../../../../context';
import { useRouteTransitionStore } from '../../../../utils';
import { MobileSurface } from '../../MobileSurface';
import { RouteCurtain } from '../../RouteCurtain';
import { styles } from '../styles';

export function CurtainDemo() {
  const { colors } = useAppTheme();
  const begin = useRouteTransitionStore((s) => s.beginSnapReveal);
  return (
    <MobileSurface>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 12 }]}>
        The ink plate sweeping navigation — cover, platen rule + eyebrow + stamp, then the
        lift with a paper chaser trailing. The stamp echoes the route registry's title;
        safety valves end every cycle. Reduced motion never mounts it.
      </Text>
      <View style={styles.toastRow}>
        <Pressable
          onPress={() => begin('up')}
          style={[styles.toastChip, { backgroundColor: colors.text, borderColor: colors.text }]}
          accessibilityRole="button"
          accessibilityLabel="Play the curtain reveal up"
        >
          <Text style={[styles.toastChipLabel, { color: colors.background }]}>Reveal up</Text>
        </Pressable>
        <Pressable
          onPress={() => begin('down')}
          style={[styles.toastChip, { backgroundColor: colors.text, borderColor: colors.text }]}
          accessibilityRole="button"
          accessibilityLabel="Play the curtain reveal down"
        >
          <Text style={[styles.toastChipLabel, { color: colors.background }]}>Reveal down</Text>
        </Pressable>
        <Link
          href="/not-a-real-route"
          style={[styles.toastChip, { borderColor: colors.border }]}
          accessibilityLabel="Open the not-found page"
        >
          <Text style={[styles.toastChipLabel, { color: colors.brandText }]}>Not-found page</Text>
        </Link>
      </View>
      <RouteCurtain />
    </MobileSurface>
  );
}
