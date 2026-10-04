// app/index.tsx
//
// ENTRY — the app opens on Your Journey (brief §4): the persisted demo
// state decides whether that's the Journey itself or the first-use
// Welcome. The old Today surface still exists at /today (moved, not
// deleted); it just isn't the front door anymore.

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context';
import { theme } from '../constants';
import { replaceWithJourneyEntry } from '../navigation';
import { useJourneyStore } from '../stores';

export default function EntryRedirect() {
  const { colors } = useAppTheme();
  const score = colors.score;
  // Persistence hydrates asynchronously — decide only once it has.
  const [hydrated, setHydrated] = useState(() => useJourneyStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsubscribe = useJourneyStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    replaceWithJourneyEntry(useJourneyStore.getState().onboarding.completed);
  }, [hydrated]);

  return (
    <View style={[styles.screen, { backgroundColor: score.canvas }]}>
      <Text style={[styles.note, { color: score.inkTertiary, fontFamily: theme.fonts.serif }]}>
        Opening your journey…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
