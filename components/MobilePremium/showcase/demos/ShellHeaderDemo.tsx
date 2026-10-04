// components/MobilePremium/showcase/demos/ShellHeaderDemo.tsx
// The composed one-drawer pattern (components/composed/AppShellHeader) —
// brand masthead + hamburger + the cutout nav drawer pre-assembled, the
// way a consumer's home surface actually mounts it. The hand-wired drawer
// section shows the pieces; this shows the assembly.
import React from 'react';
import { Text, View } from 'react-native';
import { Home, Package, TrendingUp, Settings } from '@tamagui/lucide-icons-2';
import { AppShellHeader } from '../../../composed';
import type { MobileNavDrawerItem } from '../../MobileNavDrawer';
import { useAppTheme } from '../../../../context';
import { styles } from '../styles';

export function ShellHeaderDemo() {
  const { colors } = useAppTheme();
  const items: MobileNavDrawerItem[] = [
    { id: '/', label: 'Home', icon: <Home size={18} color={colors.textColors.muted} />, onPress: () => {} },
    { id: '/items', label: 'Items', icon: <Package size={18} color={colors.textColors.muted} />, onPress: () => {} },
    { id: '/progress', label: 'Progress', icon: <TrendingUp size={18} color={colors.textColors.muted} />, badge: 3, onPress: () => {} },
    { id: '/settings', label: 'Settings', icon: <Settings size={18} color={colors.textColors.muted} />, onPress: () => {} },
  ];
  return (
    <View>
      <AppShellHeader items={items} subtitle="the composed one-drawer pattern" />
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 10 }]}>
        AppShellHeader assembles MobileHomeHeader (brand from APP_DISPLAY_NAME) +
        HamburgerButton + the cutout MobileNavDrawer in the APP_LAYOUT defaults —
        open the drawer with the hamburger above. Child screens carry the &gt; [title]
        MobileHeader instead.
      </Text>
    </View>
  );
}
