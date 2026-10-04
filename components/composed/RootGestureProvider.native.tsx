// components/composed/RootGestureProvider.native.tsx
//
// Native twin — the real gesture-handler root (see the web twin for why
// web passes through).

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function RootGestureProvider({ children }: { children: React.ReactNode }) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}
