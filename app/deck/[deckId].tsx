// app/deck/[deckId].tsx
// Deck overview. A song IS a deck: this screen exposes the deck → sub-deck
// (section) → lesson hierarchy. For song decks it lists the sub-decks
// (Intro / Verse 1 / Chorus / …); for flat decks (Foundations, …) it lists
// the lessons directly. Aggregate progress comes from lessonProgressStore.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileSurface, MobileHeader, EmptyState } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToSubDeck, navigateToLesson } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { getDeck, type SectionKind } from '../../utils/knowalong/fixtures/decks';
import { deckProgress, sectionProgress } from '../../utils/knowalong/progress';
import { useLessonProgressStore } from '../../stores/lessonProgressStore';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';
import type { IconName } from '../../utils/knowalong/icons';

const SECTION_ICON: Record<SectionKind, IconName> = {
  intro: 'sparkles',
  verse: 'book',
  chorus: 'waves',
  bridge: 'star',
  outro: 'home',
};

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.15)' }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export default function DeckOverviewScreen() {
  const { colors } = useAppTheme();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const completed = useLessonProgressStore((s) => s.completedLessonIds);

  const deck = getDeck(deckId ?? '');

  if (!deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Deck not found" onBack={safeGoBack} />
        <EmptyState title="Deck not found" message="This deck doesn't exist." />
      </SafeAreaView>
    );
  }

  const subDecks = deck.subDecks;
  const progress = subDecks ? deckProgress(subDecks, completed) : sectionProgress(deck.lessons, completed);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title={deck.title} eyebrow={subDecks ? 'Song deck' : 'Deck'} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.body}>

        {/* Hero */}
        <MobileSurface padding={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ConceptIcon name={deck.icon} size={36} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{deck.title}</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>{deck.subtitle}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {progress.done}/{progress.total} lessons · {subDecks ? `${subDecks.length} sections` : 'flat deck'}
              </Text>
              <Text style={[styles.progressPct, { color: colors.brand }]}>{progress.pct}%</Text>
            </View>
            <ProgressBar pct={progress.pct} color={colors.brand} />
          </View>
        </MobileSurface>

        {/* Sub-decks (song) or lessons (flat) */}
        {subDecks ? (
          <View style={{ marginTop: 14 }}>
            {subDecks.map((sd) => {
              const sp = sectionProgress(sd.lessons, completed);
              return (
                <Pressable key={sd.id} onPress={() => navigateToSubDeck(deck.id, sd.id)} style={{ marginBottom: 10 }}>
                  <MobileSurface padding={15}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <ConceptIcon name={SECTION_ICON[sd.kind]} size={26} color={colors.brand} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{sd.label}</Text>
                        <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                          {sd.lessons.length} lessons · {sp.done}/{sp.total} done
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, color: colors.brand }}>→</Text>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <ProgressBar pct={sp.pct} color={colors.status.success} />
                    </View>
                  </MobileSurface>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            {deck.lessons.map((lesson, li) => {
              const done = completed.includes(lesson.id);
              return (
                <Pressable
                  key={lesson.id}
                  onPress={() => navigateToLesson(lesson.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginBottom: 8 })}
                >
                  <MobileSurface padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.badge, { backgroundColor: colors.cardAlt, borderColor: done ? colors.status.success : colors.cardBorder }]}>
                        {done ? (
                          <ConceptIcon name="check" size={16} color={colors.status.success} />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{li + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{lesson.title}</Text>
                        <Text style={[styles.rowSub, { color: colors.textMuted }]}>{lesson.subtitle}</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: colors.brand }}>→</Text>
                    </View>
                  </MobileSurface>
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  heroSub: { fontSize: 13, marginTop: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  progressPct: { fontSize: 13, fontWeight: '700' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  badge: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
});
