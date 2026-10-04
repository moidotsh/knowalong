// app/lessons.tsx
// The deck browser. Each deck is a card that drills into its overview
// (/deck/[deckId]). Song decks list their sub-decks (sections) there;
// flat decks list their lessons directly. A lesson tap reaches the
// chip-builder player at /lessons/[lessonId].

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToDeck } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { ALL_DECKS } from '../utils/knowalong/fixtures/decks';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

export default function LessonsScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Lessons" eyebrow="Learn Russian" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {ALL_DECKS.map((deck) => {
          const sectionCount = deck.subDecks?.length;
          return (
            <Pressable key={deck.id} onPress={() => navigateToDeck(deck.id)} style={{ marginBottom: 12 }}>
              <MobileSurface padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <ConceptIcon name={deck.icon} size={32} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deckTitle}>{deck.title}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{deck.subtitle}</Text>
                    <Text style={[styles.deckCount, { color: colors.textMuted }]}>
                      {sectionCount ? `${sectionCount} sections · ` : ''}{deck.lessons.length} lesson{deck.lessons.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
                </View>
              </MobileSurface>
            </Pressable>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Deck titles ride the display face — each deck is a line on the
  // network map, and lines get signage type.
  deckTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    fontFamily: theme.fonts.display,
  },
  deckCount: {
    ...theme.typography.mobileEyebrow,
    marginTop: 4,
  },
});
