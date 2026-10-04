// components/composed/RootGestureProvider.tsx
//
// The gesture root, web twin: a plain passthrough View. The REAL
// GestureHandlerRootView (react-native-gesture-handler) costs ~1MB of
// bundle (it drags react-native-reanimated + worklets through its
// reanimatedWrapper) and the starter's web build mounts no
// gesture-handler gestures — MobilePremium interaction runs RN Animated.
// The native twin (RootGestureProvider.native.tsx) keeps the real root
// for native exports.

import { View } from 'react-native';

export function RootGestureProvider({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
