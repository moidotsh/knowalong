// app/welcome.tsx
//
// WELCOME — first use (brief §11). One question, two honest doors. No
// account, no signup wall — choosing either simply shapes where the demo
// starts: from the piece of music-like text, or from the language itself.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context';
import { theme } from '../constants';
import { navigateToCollectionItem, switchToJourney } from '../navigation';
import { useJourneyStore, type OnboardingSource } from '../stores';

const DOORS: Array<{
  source: OnboardingSource;
  title: string;
  note: string;
  detail: string;
}> = [
  {
    source: 'song',
    title: 'A song I love',
    note: 'Start from something that already lives in your head.',
    detail: 'The demo begins with an original practice text — “City lights” — written for learning, no licensing strings attached.',
  },
  {
    source: 'language',
    title: 'Start with the language',
    note: 'Begin with a few everyday phrases and build out.',
    detail: 'Chapter one meets the same original text, one small piece at a time.',
  },
];

export default function WelcomeScreen() {
  const store = useJourneyStore();
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const choose = (source: OnboardingSource) => {
    store.completeOnboarding(source);
    if (source === 'song') {
      // The song door opens onto the piece itself.
      switchToJourney();
      navigateToCollectionItem('city-lights');
    } else {
      switchToJourney();
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: score.canvas }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.wordmark, { color: score.inkTertiary }]}>KnowAlong</Text>
        <Text style={[styles.question, { color: score.ink, fontFamily: fonts.serif }]}>
          What made you want to learn Russian?
        </Text>

        {DOORS.map((door) => (
          <Pressable
            key={door.source}
            onPress={() => choose(door.source)}
            accessibilityRole="button"
            accessibilityLabel={door.title}
            style={({ pressed }) => [
              styles.door,
              { backgroundColor: score.paper, borderColor: score.ruleStrong },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.doorTitle, { color: score.ink, fontFamily: fonts.serif }]}>{door.title}</Text>
            <Text style={[styles.doorNote, { color: score.inkSecondary }]}>{door.note}</Text>
            <Text style={[styles.doorDetail, { color: score.inkTertiary }]}>{door.detail}</Text>
          </Pressable>
        ))}

        <Text style={[styles.footnote, { color: score.inkTertiary }]}>
          A prototype — demo content only, no account, nothing to buy. You
          can change your mind later; nothing here is a test.
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  wordmark: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  door: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 6,
  },
  doorTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  doorNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  doorDetail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
});
