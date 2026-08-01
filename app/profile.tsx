// app/profile.tsx
// Learner profile — identity, language(s), streak record, total time,
// study preferences summary. The "who you are as a learner" page.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobileSectionEyebrow } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToSettings } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { useStreakStore } from '../stores/streakStore';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const studyDates = useStreakStore((s) => s.studyDates);
  const concepts = useStreakStore((s) => s.conceptsMastered);
  const lessons = useStreakStore((s) => s.lessonsCompleted);
  const sessions = useStreakStore((s) => s.totalSessions);
  const streak = useStreakStore((s) => s.getStreak(5).streak);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Profile" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {/* Identity */}
        <MobileSurface padding={24}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: colors.brand + '20', justifyContent: 'center', alignItems: 'center',
            }}>
              <ConceptIcon name="user" size={32} color={colors.brand} />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Demo Learner</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>Learning Russian 🇷🇺</Text>
            </View>
          </View>
        </MobileSurface>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {[
            { icon: 'flame' as const, value: streak, label: 'Day streak' },
            { icon: 'brain' as const, value: concepts, label: 'Concepts mastered' },
            { icon: 'book' as const, value: lessons, label: 'Lessons completed' },
            { icon: 'star' as const, value: sessions, label: 'Study sessions' },
            { icon: 'check' as const, value: studyDates.length, label: 'Total study days' },
          ].map((stat, i) => (
            <MobileSurface key={i} padding={14}>
              <View style={{ minWidth: 100 }}>
                <ConceptIcon name={stat.icon} size={24} color={colors.brand} />
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 6 }}>{stat.value}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{stat.label}</Text>
              </View>
            </MobileSurface>
          ))}
        </View>

        {/* Study preferences */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Study preferences</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Daily goal</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>10 phrases</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Weekly target</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>5 days</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Target language</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Russian</Text>
            </View>
          </MobileSurface>
          <View style={{ height: 12 }} />
          <Pressable onPress={navigateToSettings}>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>All settings</Text>
              <Text style={{ fontSize: 16, color: colors.brand }}>→</Text>
            </View>
          </MobileSurface>
          </Pressable>
        </View>
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>About</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
              KnowAlong teaches languages from basic principles — you build phrases
              atom by atom (я → я вижу → я вижу море), then learn from song lyrics
              by studying the concepts each verse needs.
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
              Prototype · Demo mode · No data leaves your device
            </Text>
          </MobileSurface>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
