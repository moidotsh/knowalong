// components/MobilePremium/showcase/demos/TabBarDemo.tsx
// The kit's bottom chrome — four flanking tabs plus the raised center
// action with its live resume pulse.
import React from 'react';
import { Text, View } from 'react-native';
import { Home, Package, TrendingUp, CalendarDays, Play } from '@tamagui/lucide-icons-2';
import { useAppTheme } from '../../../../context';
import { MobileTabBar } from '../../MobileTabBar';
import { styles } from '../styles';

export function TabBarDemo() {
  const { colors } = useAppTheme();
  const [active, setActive] = React.useState('home');
  const [resume, setResume] = React.useState(false);
  const icon = (I: any) => <I size={19} color={colors.textMuted} />;
  const iconActive = (I: any) => <I size={19} color={colors.text} />;
  const items = [
    { id: 'home', label: 'Home', icon: active === 'home' ? iconActive(Home) : icon(Home), onPress: () => setActive('home') },
    { id: 'library', label: 'Library', icon: active === 'library' ? iconActive(Package) : icon(Package), onPress: () => setActive('library') },
    { id: 'progress', label: 'Progress', icon: active === 'progress' ? iconActive(TrendingUp) : icon(TrendingUp), onPress: () => setActive('progress') },
    { id: 'program', label: 'Program', icon: active === 'program' ? iconActive(CalendarDays) : icon(CalendarDays), onPress: () => setActive('program') },
  ] as [any, any, any, any];
  return (
    <View style={{ marginTop: 12 }}>
      <MobileTabBar
        items={items}
        activeId={active}
        centerAction={{
          label: resume ? 'Resume session' : 'Start session',
          active: resume,
          icon: <Play size={22} color={colors.textOnBrand} />,
          onPress: () => setResume((v) => !v),
        }}
        testID="showcase-tab-bar"
      />
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 8 }]}>
        Tap the center action to toggle the resume pulse.
      </Text>
    </View>
  );
}
