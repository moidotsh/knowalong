// app/achievements.tsx
// Milestones + badges. Shows earned + locked achievements based on the
// streak store's real data (sessions, streaks, concepts, lessons).

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobileSectionEyebrow } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { useStreakStore } from '../stores/streakStore';

interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
}

export default function AchievementsScreen() {
  const { colors } = useAppTheme();
  const studyDates = useStreakStore((s) => s.studyDates);
  const concepts = useStreakStore((s) => s.conceptsMastered);
  const lessons = useStreakStore((s) => s.lessonsCompleted);
  const sessions = useStreakStore((s) => s.totalSessions);
  const streak = useStreakStore((s) => s.getStreak(5).streak);

  const achievements: Achievement[] = [
    { id: 'first-step', emoji: '👣', title: 'First Steps', description: 'Complete your first study session', earned: sessions >= 1 },
    { id: 'streak-3', emoji: '🔥', title: 'On Fire', description: '3-day study streak', earned: streak >= 3 },
    { id: 'streak-7', emoji: '🔥', title: 'Week Warrior', description: '7-day study streak', earned: streak >= 7 },
    { id: 'streak-30', emoji: '🏆', title: 'Unstoppable', description: '30-day study streak', earned: streak >= 30 },
    { id: 'concepts-5', emoji: '🧠', title: 'Quick Learner', description: 'Master 5 concepts', earned: concepts >= 5 },
    { id: 'concepts-10', emoji: '🎓', title: 'Foundation Builder', description: 'Master 10 concepts', earned: concepts >= 10 },
    { id: 'concepts-25', emoji: '📚', title: 'Vocabulary Vault', description: 'Master 25 concepts', earned: concepts >= 25 },
    { id: 'lesson-1', emoji: '📖', title: 'Lesson Learned', description: 'Complete a gradient lesson', earned: lessons >= 1 },
    { id: 'lesson-3', emoji: '✨', title: 'Pattern Builder', description: 'Complete 3 gradient lessons', earned: lessons >= 3 },
    { id: 'sessions-10', emoji: '⭐', title: 'Dedicated', description: '10 study sessions', earned: sessions >= 10 },
    { id: 'sessions-50', emoji: '💎', title: 'Diamond Mind', description: '50 study sessions', earned: sessions >= 50 },
    { id: 'sessions-100', emoji: '👑', title: 'Centurion', description: '100 study sessions', earned: sessions >= 100 },
  ];

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Achievements" eyebrow={`Learn Russian · ${earned.length} earned`} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {/* Summary */}
        <MobileSurface padding={20}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.status.success }}>{earned.length}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>earned</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.brand }}>{streak}🔥</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>streak</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{sessions}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>sessions</Text>
            </View>
          </View>
        </MobileSurface>

        {/* Earned */}
        {earned.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>Earned ({earned.length})</MobileSectionEyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {earned.map((a) => (
                <View key={a.id} style={{ width: '47%', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.status.success + '30', backgroundColor: colors.status.success + '08' }}>
                  <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 }}>{a.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{a.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Locked */}
        {locked.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>Locked ({locked.length})</MobileSectionEyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {locked.map((a) => (
                <View key={a.id} style={{ width: '47%', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.cardBorder, backgroundColor: colors.cardAlt, opacity: 0.6 }}>
                  <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginTop: 6 }}>{a.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{a.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
