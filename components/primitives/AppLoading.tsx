// components/primitives/AppLoading.tsx
// App-level loading indicator for first-paint / non-blocking full-screen
// wait states (splash → auth check → first screen). Audit C4 requires
// every ActivityIndicator usage to live inside one of the three loading
// primitives — this is the app-level primitive.

import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '../../context';

interface AppLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  color?: string;
}

export function AppLoading({
  message,
  size = 'medium',
  fullScreen = false,
  color,
}: AppLoadingProps) {
  const { colors } = useAppTheme();
  const spinnerSize = size === 'small' ? 'small' : 'large';

  return (
    <View
      style={[
        styles.container,
        fullScreen && { flex: 1, backgroundColor: colors.background },
      ]}
    >
      {/* c4-exempt: this primitive IS the ActivityIndicator wrapper. */}
      <ActivityIndicator size={spinnerSize} color={color ?? colors.textMuted} />
      {message ? (
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AppLoading;
