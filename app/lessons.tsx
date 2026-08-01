// app/lessons.tsx
// The deck browser. Shows all decks as expandable sections with their
// lessons inside. Tapping a lesson → /lessons/[lessonId] (the chip-builder
// player). Decks: Foundations, Daily Life, Expressions, Светофор.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToLesson } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { ALL_DECKS, type Deck, type Lesson } from '../utils/knowalong/fixtures/decks';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

export default function LessonsScreen() {
  const { colors } = useAppTheme();
  const [expandedDeck, setExpandedDeck] = useState<string | null>(ALL_DECKS[0]?.id ?? null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Lessons" eyebrow="Learn Russian" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {ALL_DECKS.map((deck) => {
          const isExpanded = expandedDeck === deck.id;
          return (
            <View key={deck.id} style={{ marginBottom: 12 }}>
              {/* Deck header */}
              <Pressable onPress={() => setExpandedDeck(isExpanded ? null : deck.id)}>
                <MobileSurface padding={16}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <ConceptIcon name={deck.icon} size={32} color={colors.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{deck.title}</Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{deck.subtitle}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        {deck.lessons.length} lesson{deck.lessons.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: colors.textMuted }}>{isExpanded ? '−' : '+'}</Text>
                  </View>
                </MobileSurface>
              </Pressable>

              {/* Lessons within deck */}
              {isExpanded ? (
                <View style={{ marginTop: 6, marginLeft: 12, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.brand + '20' }}>
                  {deck.lessons.map((lesson, li) => (
                    <Pressable
                      key={lesson.id}
                      onPress={() => navigateToLesson(lesson.id)}
                      style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      {/* Step number */}
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: colors.cardAlt, borderWidth: 1.5, borderColor: colors.cardBorder,
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{li + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{lesson.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>{lesson.subtitle}</Text>
                      </View>
                      <ConceptIcon name={lesson.icon} size={20} color={colors.textMuted} />
                      <Text style={{ fontSize: 14, color: colors.brand }}>→</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}
