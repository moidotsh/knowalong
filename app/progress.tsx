// app/progress.tsx
// Progress dashboard — the learner's mastery state at a glance: skill tree
// (all concepts color-coded by mastery), detailed stats, + a 7-day streak
// calendar. Prototype fixtures drive the UI.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobileSectionEyebrow } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToStudy } from '../navigation';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../utils/knowalong/icons';
import { SCREEN_BODY_STYLE } from '../constants';
import {
  LEARNING_PATH,
  LEARNER_STATS,
  STREAK_CALENDAR,
  type MasteryState,
} from '../utils/knowalong/fixtures/learnerPath';

function masteryColor(colors: ReturnType<typeof useAppTheme>['colors'], state: MasteryState): string {
  if (state === 'mastered') return colors.status.success;
  if (state === 'in-progress') return colors.brand;
  return colors.textMuted;
}

function masteryLabel(state: MasteryState): string {
  if (state === 'mastered') return 'Mastered';
  if (state === 'in-progress') return 'Learning';
  return 'Locked';
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function ProgressScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Your progress" eyebrow="Learn Russian" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { value: `${LEARNER_STATS.conceptsMastered}/${LEARNER_STATS.conceptsTotal}`, label: 'Concepts', color: colors.status.success },
            { value: `${LEARNER_STATS.streakDays}`, label: 'Streak', color: colors.status.warning },
            { value: `${LEARNER_STATS.sessionsCompleted}`, label: 'Sessions', color: colors.brand },
            { value: `${LEARNER_STATS.minutesStudied}m`, label: 'Studied', color: colors.textSecondary },
          ].map((stat, i) => (
            <MobileSurface key={i} padding={12}>
              <View style={{ flex: 1, minWidth: 60 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{stat.label}</Text>
              </View>
            </MobileSurface>
          ))}
        </View>

        {/* Streak calendar */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>This week</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {STREAK_CALENDAR.map((studied, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: studied ? colors.brand : 'rgba(128,128,128,0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ConceptIcon name="flame" size={18} color={studied ? colors.status.warning : 'transparent'} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{DAYS[i]}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
              {LEARNER_STATS.streakDays} day streak — keep it going!
            </Text>
          </MobileSurface>
        </View>

        {/* Skill tree */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Skill tree</MobileSectionEyebrow>
          {LEARNING_PATH.map((tier) => (
            <View key={tier.tier} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                Tier {tier.tier} · {tier.label}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tier.concepts.map((concept) => {
                  const mc = masteryColor(colors, concept.state);
                  return (
                    <Pressable
                      key={concept.code}
                      onPress={() => navigateToStudy()}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: mc + '40',
                        backgroundColor: mc + '10',
                        alignItems: 'center',
                        minWidth: 72,
                      }}
                    >
                      <View style={{ marginBottom: 2 }}><ConceptIcon name={ITEM_ICONS[concept.code] ?? 'star'} size={22} color={masteryColor(colors, concept.state)} /></View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{concept.surfaceForm}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{concept.meaning}</Text>
                      <View style={{ marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: mc + '20' }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: mc }}>{masteryLabel(concept.state)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Accuracy */}
        <View style={{ marginTop: 8 }}>
          <MobileSectionEyebrow>Accuracy</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.brand, textAlign: 'center' }}>
              {LEARNER_STATS.accuracyPct}%
            </Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginTop: 12 }}>
              <View style={{ height: '100%', width: `${LEARNER_STATS.accuracyPct}%`, backgroundColor: colors.brand, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
              Across {LEARNER_STATS.sessionsCompleted} study sessions
            </Text>
          </MobileSurface>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
