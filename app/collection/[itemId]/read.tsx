// app/collection/[itemId]/read.tsx
//
// EXPLORE READER — the passage with its annotations (brief §9). Tap a
// line for its meaning; tap a word for its sheet. The audio states are
// honest: when speech synthesis isn't around, the reader says so instead
// of pretending.

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PassageReader } from '../../../components/journey';
import { useAppTheme } from '../../../context';
import { theme } from '../../../constants';
import { navigateToCollectionItem, safeGoBack } from '../../../navigation';
import { getMediaItem, type MediaItem } from '../../../utils/journey';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ itemId: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';
  const media: MediaItem | null = getMediaItem(itemId);

  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const header = useMemo(() => {
    if (!media) return null;
    return (
      <View style={styles.head}>
        <Pressable
          onPress={() => navigateToCollectionItem(media.id)}
          accessibilityRole="button"
          accessibilityLabel="Back to the item"
        >
          <Text style={[styles.link, { color: score.accent }]}>← {media.title}</Text>
        </Pressable>
        <Text style={[styles.origin, { color: score.inkTertiary }]}>{media.originLabel}</Text>
      </View>
    );
  }, [media, score.accent, score.inkTertiary]);

  if (!media) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: score.canvas }]} edges={['top', 'bottom']}>
        <Text style={[styles.missingTitle, { color: score.ink }]}>That passage isn’t in your collection.</Text>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.link, { color: score.accent }]}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: score.canvas }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <Text style={[styles.readerTitle, { color: score.ink, fontFamily: fonts.serif }]}>{media.title}</Text>
        <PassageReader media={media} />
        <Text style={[styles.footnote, { color: score.inkTertiary }]}>
          Tap a line for its meaning; tap any word for its sheet. This is
          the same text your sessions return to.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  head: {
    gap: 2,
  },
  link: {
    fontSize: 15,
    lineHeight: 20,
  },
  origin: {
    fontSize: 12,
    lineHeight: 16,
  },
  readerTitle: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  missingTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
