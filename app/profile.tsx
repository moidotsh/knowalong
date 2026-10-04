// app/profile.tsx
// Learner profile — identity, language(s), streak record, total time,
// study preferences summary. The "who you are as a learner" page — now a
// tab surface (§1.1) that also stewards the song shelf: the active song
// pointer, archived songs with restore, and the explicit-lyrics opt-in
// (§1.2: warned first, always the learner's call, revocable here).

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobileCheckboxItem,
} from '../components/MobilePremium';
import { SongTabBar } from '../components/knowalong';
import { useAppTheme } from '../context';
import { navigateToSettings } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { useStreakStore } from '../stores/streakStore';
import { useSongShelfStore } from '../stores';
import { useSourceSong } from '../hooks/queries';
import { DEMO_SONG_ID } from '../utils/knowalong/song/demoSongAdapter';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

/** An archived song row — projects its source quietly; restore returns it
 *  to the shelf (§1.1: archived is restorable, never destructive). */
function ArchivedSongRow({ sourceId, onRestore }: { sourceId: string; onRestore: () => void }) {
  const { colors } = useAppTheme();
  const song = useSourceSong(sourceId);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <ConceptIcon name="book" size={20} color={colors.textMuted} />
      <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
        {song?.title ?? 'Saved song'}
      </Text>
      <Pressable hitSlop={8} onPress={onRestore} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>RESTORE</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const studyDates = useStreakStore((s) => s.studyDates);
  const concepts = useStreakStore((s) => s.conceptsMastered);
  const lessons = useStreakStore((s) => s.lessonsCompleted);
  const sessions = useStreakStore((s) => s.totalSessions);
  const streak = useStreakStore((s) => s.getStreak(5).streak);

  const activeSongId = useSongShelfStore((s) => s.activeSongId);
  const archivedSongIds = useSongShelfStore((s) => s.archivedSongIds);
  const restoreSong = useSongShelfStore((s) => s.restoreSong);
  const explicitOptIn = useSongShelfStore((s) => s.explicitContentOptIn);
  const optInToExplicitContent = useSongShelfStore((s) => s.optInToExplicitContent);
  const revokeExplicitContentOptIn = useSongShelfStore((s) => s.revokeExplicitContentOptIn);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Profile" eyebrow="Learn from lyrics" />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}>

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
              <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 20, lineHeight: 26, fontFamily: theme.fonts.display, color: colors.text }}>Demo Learner</Text>
              <Text style={{ ...theme.typography.mobileBody, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 2 }}>Learning Russian 🇷🇺</Text>
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
                <Text style={{ ...theme.typography.mobileFigure, color: colors.text, marginTop: 6 }}>{stat.value}</Text>
                <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 10, lineHeight: 14, color: colors.textMuted, marginTop: 2 }}>{stat.label}</Text>
              </View>
            </MobileSurface>
          ))}
        </View>

        {/* Your songs — shelf stewardship (§1.1) */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Your songs</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>Leading Today</Text>
              <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text, flexShrink: 1, marginLeft: 12 }} numberOfLines={1}>
                {!activeSongId || activeSongId === DEMO_SONG_ID ? 'Demo song' : 'Saved song'}
              </Text>
            </View>
            {archivedSongIds.length > 0 ? (
              <>
                <View style={{ height: 1, backgroundColor: colors.cardAlt, marginVertical: 8 }} />
                <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 10, lineHeight: 14, color: colors.textMuted }}>
                  ARCHIVED
                </Text>
                {archivedSongIds.map((id) => (
                  <ArchivedSongRow key={id} sourceId={id} onRestore={() => restoreSong(id)} />
                ))}
              </>
            ) : null}
          </MobileSurface>
        </View>

        {/* Study preferences */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Study preferences</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>Daily goal</Text>
              <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>10 phrases</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>Weekly target</Text>
              <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>5 days</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>Target language</Text>
              <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>Russian</Text>
            </View>
          </MobileSurface>
          <View style={{ height: 12 }} />
          <Pressable onPress={navigateToSettings} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Open all settings">
          <MobileSurface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...theme.typography.mobileEyebrow, color: colors.brand, textTransform: 'uppercase' }}>All settings</Text>
              <Text style={{ fontSize: 16, color: colors.brand }}>→</Text>
            </View>
          </MobileSurface>
          </Pressable>
        </View>

        {/* Content — explicit-lyrics opt-in (§1.2: warned, opt-in, revocable) */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Content</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <MobileCheckboxItem
              title="Explicit-lyrics passages"
              subtitle="Some songs carry an explicit tag. Their passages stay readable — but practice stays hidden — until you opt in. You can change this any time."
              checked={explicitOptIn}
              onToggle={() => (explicitOptIn ? revokeExplicitContentOptIn() : optInToExplicitContent())}
            />
          </MobileSurface>
        </View>

        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>About</MobileSectionEyebrow>
          <MobileSurface padding={16}>
            <Text style={{ ...theme.typography.mobileBody, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
              KnowAlong teaches languages from basic principles — you build phrases
              atom by atom (я → я вижу → я вижу море), then learn from song lyrics
              by studying the concepts each verse needs.
            </Text>
            <Text style={{ ...theme.typography.mobileLedger, fontSize: 10, lineHeight: 14, color: colors.textMuted, marginTop: 12 }}>
              Prototype · Demo mode · No data leaves your device
            </Text>
          </MobileSurface>
        </View>

      </ScrollView>

      <SongTabBar activeId="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
});
