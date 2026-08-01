// app/index.tsx
// KnowAlong home — the learning dashboard. Shows the learner's journey:
// continue-learning hero, learning path (tiered concept chips), quick stats,
// + the lyrics library (demoted to secondary). Answers "what next?" + "how
// am I doing?" Prototype fixtures drive the UI (no live DB).

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileSectionEyebrow,
} from '../components/MobilePremium';
import { useAppTheme } from '../context';
import {
  navigateToImport,
  navigateToStudy,
  navigateToSettings,
  navigateToLessons,
  navigateToProgress,
  navigateToAchievements,
} from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import {
  LEARNING_PATH,
  LEARNER_STATS,
  NEXT_ACTION,
  type PathConcept,
  type MasteryState,
} from '../utils/knowalong/fixtures/learnerPath';

function masteryColor(colors: ReturnType<typeof useAppTheme>['colors'], state: MasteryState): string {
  if (state === 'mastered') return colors.status.success;
  if (state === 'in-progress') return colors.brand;
  return colors.textMuted;
}

function masteryIcon(state: MasteryState): string {
  if (state === 'mastered') return '✓';
  if (state === 'in-progress') return '●';
  return '🔒';
}

function StatCard({ value, label, color, mutedColor }: { value: string; label: string; color: string; mutedColor: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function PathChip({ concept, colors }: { concept: PathConcept; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const mc = masteryColor(colors, concept.state);
  return (
    <Pressable
      onPress={() => navigateToStudy()}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: mc + '40',
        backgroundColor: mc + '12',
        alignItems: 'center',
        minWidth: 80,
      }}
    >
      <Text style={{ fontSize: 22, marginBottom: 2 }}>{concept.emoji}</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{concept.surfaceForm}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{concept.meaning}</Text>
      <Text style={{ fontSize: 10, color: mc, marginTop: 3, fontWeight: '700' }}>
        {masteryIcon(concept.state)}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title="Learn Russian"
        eyebrow="KnowAlong"
        rightAction={
          <Pressable onPress={navigateToSettings} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>Settings</Text>
          </Pressable>
        }
      />

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {/* Continue learning hero */}
        <Pressable onPress={() => navigateToStudy()}>
          <MobileSurface padding={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 44 }}>{NEXT_ACTION.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Continue learning
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  {NEXT_ACTION.label}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {NEXT_ACTION.subtitle}
                </Text>
              </View>
              <Text style={{ fontSize: 22, color: colors.brand }}>→</Text>
            </View>
          </MobileSurface>
        </Pressable>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <MobileSurface padding={14}>
            <StatCard value={`${LEARNER_STATS.conceptsMastered}/${LEARNER_STATS.conceptsTotal}`} label="concepts" color={colors.status.success} mutedColor={colors.textMuted} />
          </MobileSurface>
          <MobileSurface padding={14}>
            <StatCard value={`${LEARNER_STATS.streakDays} 🔥`} label="day streak" color={colors.status.warning} mutedColor={colors.textMuted} />
          </MobileSurface>
          <MobileSurface padding={14}>
            <StatCard value={`${LEARNER_STATS.accuracyPct}%`} label="accuracy" color={colors.brand} mutedColor={colors.textMuted} />
          </MobileSurface>
        </View>

        {/* Learning path */}
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <MobileSectionEyebrow>Your learning path</MobileSectionEyebrow>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => navigateToAchievements()}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}>🏆 Achievements</Text>
              </Pressable>
              <Pressable onPress={() => navigateToProgress()}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}>Progress →</Text>
              </Pressable>
            </View>
          </View>
          {LEARNING_PATH.map((tier) => (
            <View key={tier.tier} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                Tier {tier.tier} · {tier.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tier.concepts.map((concept) => (
                  <PathChip key={concept.code} concept={concept} colors={colors} />
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Gradient lessons CTA */}
        <Pressable onPress={() => navigateToLessons()} style={{ marginTop: 8 }}>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28 }}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Gradient lessons</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Build phrases step by step — "I" → "I see" → "I see the sea"
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
            </View>
          </MobileSurface>
        </Pressable>

        {/* Lyrics library (demoted) */}
        <View style={{ marginTop: 24 }}>
          <MobileSectionEyebrow>Lyrics library</MobileSectionEyebrow>
          <Pressable onPress={() => navigateToImport()}>
            <MobileSurface padding={16}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                No lyrics imported yet. Paste a song to learn from its verses.
              </Text>
            </MobileSurface>
          </Pressable>
        </View>
      </ScrollView>

      <MobileActionFooter>
        <MobilePrimaryButton onPress={() => navigateToStudy()} variant="primary">
          Continue learning
        </MobilePrimaryButton>
        <MobilePrimaryButton onPress={() => navigateToLessons()} variant="secondary">
          Browse lessons
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 },
});
