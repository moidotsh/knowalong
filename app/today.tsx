// app/index.tsx
// TODAY — the song-first home (design doc §1.1). One canonical song leads:
// the active song's next useful passage (arc or culminating line, resolved
// by the same generator the deck runtime plays). Brand-new learners are led
// by the first-use question instead (§1.2: "Which song made you want to
// learn?" → the licensed demo passage, or bring your own via the lawful
// import route). Due reviews stay one tap away; the existing learning
// utilities (lessons, grammar, alphabet, numbers, conversation) remain as
// quiet entries — nothing deleted, only the duplicate entry points retired
// (the composition stream lives on as the Study surface, the demo song's
// old fixture card as the song shelf).
//
// The playable song on Today is the demo song until validated packs land
// (Part D) — library songs surface honestly on the shelf, never faked here.

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere } from '../components/MobilePremium';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { Rollsign, SongTabBar } from '../components/knowalong';
import { useAppTheme } from '../context';
import {
  navigateToAlphabet,
  navigateToConversation,
  navigateToGrammar,
  navigateToImport,
  navigateToLesson,
  navigateToLessons,
  navigateToMistakes,
  navigateToNumbers,
  navigateToReview,
  navigateToSettings,
  navigateToSong,
  navigateToSongSection,
} from '../navigation';
import { useSongShelfStore } from '../stores';
import { useStreakStore } from '../stores/streakStore';
import { useLessonProgressStore } from '../stores/lessonProgressStore';
import { useWordMasteryStore } from '../stores/wordMasteryStore';
import { demoPracticeProgress, demoSongToCanonical, DEMO_SONG_ID } from '../utils/knowalong/song/demoSongAdapter';
import { nextDemoPassage, selectDueWords } from '../utils/knowalong/song/selectors';
import { prefetchAudio } from '../utils/knowalong/tts';
import { nextLessonAudioTexts } from '../utils/knowalong/progress';
import { SCREEN_BODY_STYLE, theme } from '../constants';

const DAILY_GOAL = 10;

export default function TodayScreen() {
  const { colors } = useAppTheme();
  const streakDays = useStreakStore((s) => s.getStreak(5).streak);
  const mistakeCodes = useStreakStore((s) => s.mistakeCodes);
  const sessionsToday = useStreakStore((s) => s.totalSessions);
  const mastery = useWordMasteryStore((s) => s.mastery);
  const completedLessonIds = useLessonProgressStore((s) => s.completedLessonIds);
  const firstUseDone = useSongShelfStore((s) => s.firstUseDone);
  const completeFirstUse = useSongShelfStore((s) => s.completeFirstUse);
  const setAspiration = useSongShelfStore((s) => s.setAspiration);
  const passagePriorities = useSongShelfStore((s) => s.passagePriorities);

  // First-use card local state — discarded once answered or skipped.
  const [wantTitle, setWantTitle] = useState('');
  const [wantArtist, setWantArtist] = useState('');

  const song = useMemo(() => demoSongToCanonical(), []);
  const next = useMemo(() => nextDemoPassage(mastery, completedLessonIds), [mastery, completedLessonIds]);
  const due = useMemo(() => selectDueWords(mastery, [song]), [mastery, song]);
  const progress = useMemo(() => demoPracticeProgress(mastery), [mastery]);
  const prioritySection = useMemo(() => {
    const ordinal = passagePriorities[song.id];
    return ordinal ? song.sections.find((s) => s.ordinal === ordinal) ?? null : null;
  }, [passagePriorities, song]);

  const dailyProgress = Math.min(sessionsToday % DAILY_GOAL, DAILY_GOAL);
  const dailyMet = sessionsToday > 0 && dailyProgress >= DAILY_GOAL;

  // Returning learners (audio already cached): pre-warm the next lesson's
  // cards so whatever they open next is instant. First-timers are skipped —
  // their first lesson's loading gate handles prefetch.
  useEffect(() => {
    if (!firstUseDone) return;
    const texts = nextLessonAudioTexts(completedLessonIds);
    if (texts.length) void prefetchAudio(texts);
  }, [firstUseDone, completedLessonIds]);

  // ── §1.2 first use ─────────────────────────────────────────────────────
  const startWithDemo = () => {
    completeFirstUse();
    navigateToSong(DEMO_SONG_ID);
  };
  const bringOwnSong = () => {
    if (wantTitle.trim()) setAspiration({ title: wantTitle.trim(), artist: wantArtist.trim() });
    completeFirstUse();
    navigateToImport();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />

      {/* Header — streak + daily progress + settings */}
      <View style={styles.header}>
        <Pressable onPress={() => navigateToReview()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ConceptIcon name="flame" size={16} color={colors.status.warning} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.status.warning }}>{streakDays}</Text>
        </Pressable>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {dailyMet ? 'Goal met ✓' : `${dailyProgress}/${DAILY_GOAL} today`}
        </Text>
        <Pressable onPress={navigateToSettings} hitSlop={8}>
          <ConceptIcon name="user" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Daily progress bar — subtle, integrated */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: 'rgba(128,128,128,0.12)' }}>
          <View style={{ height: '100%', borderRadius: 1.5, width: `${(dailyProgress / DAILY_GOAL) * 100}%`, backgroundColor: dailyMet ? colors.status.success : colors.brand }} />
        </View>
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}>
        {/* §1.2 — first use leads with the song question, never a signup wall */}
        {!firstUseDone ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.mobilePremium.hairlineBorder }]}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>First visit</Text>
            <Text style={[styles.firstUseQuestion, { color: colors.text }]}>Which song made you want to learn?</Text>
            <Pressable onPress={startWithDemo} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.actionLabel, { color: colors.textOnBrand }]}>Start with the demo song</Text>
              <Text style={{ ...theme.typography.mobileMeta, color: colors.textOnBrand, opacity: 0.8, marginTop: 2 }}>
                «Светофор» · Mnogoznaal — a real song, licensed for the demo
              </Text>
            </Pressable>
            <View style={{ marginTop: 14, gap: 8 }}>
              <TextInput
                value={wantTitle}
                onChangeText={setWantTitle}
                placeholder="Song title"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.mobilePremium.hairlineBorder, color: colors.text, backgroundColor: colors.backgroundDeep }]}
              />
              <TextInput
                value={wantArtist}
                onChangeText={setWantArtist}
                placeholder="Artist (optional)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.mobilePremium.hairlineBorder, color: colors.text, backgroundColor: colors.backgroundDeep }]}
              />
              <Pressable onPress={bringOwnSong} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.brand, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.actionLabel, { color: colors.brand }]}>Add that song</Text>
              </Pressable>
              <Text style={[theme.typography.mobileMeta, { color: colors.textMuted }]}>
                Start with the included demo song, or paste the lyrics yourself — the text stays on this device.
              </Text>
            </View>
            <Pressable onPress={completeFirstUse} hitSlop={8} style={{ marginTop: 12, alignSelf: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Skip for now</Text>
            </Pressable>
          </View>
        ) : null}

        {/* The active song's next useful passage — Today's hero (§1.1) */}
        {firstUseDone && next ? (
          <View>
            <Pressable onPress={() => navigateToLesson(next.lessonId)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
              <Rollsign
                destination={next.lessonTitle}
                eyebrow={`Next passage · ${song.title}`}
                meta={`${next.sectionLabel} · ${song.artist ?? ''}`}
                testID="today-rollsign"
              />
            </Pressable>
            <Pressable onPress={() => navigateToLesson(next.lessonId)} style={{ marginTop: 12 }}>
              <View style={[styles.primaryAction, { backgroundColor: colors.brand }]}>
                <Text style={[styles.actionLabel, { color: colors.textOnBrand }]}>
                  {completedLessonIds.length > 0 ? 'Continue' : 'Start'}
                </Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Text style={[theme.typography.mobileMeta, { color: colors.textMuted }]}>
                {progress.practisedLines}/{song.practice.totalLines} lines practised
              </Text>
              <Pressable onPress={() => navigateToSong(song.id)} hitSlop={6}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}>Open song →</Text>
              </Pressable>
            </View>
            {prioritySection ? (
              <Pressable onPress={() => navigateToSongSection(song.id, prioritySection.id)} hitSlop={6} style={{ marginTop: 6 }}>
                <Text style={[theme.typography.mobileMeta, { color: colors.textSecondary }]}>
                  Or start from your pick: {prioritySection.label} →
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* §1.1 — the due-review set, quiet but explicit */}
        {firstUseDone && due.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Asking for review</Text>
            <Pressable onPress={() => navigateToReview()} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.mobilePremium.hairlineBorder, opacity: pressed ? 0.85 : 1 }]}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {due.slice(0, 4).map((w) => (
                  <View key={w.key} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.cardAlt }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                  </View>
                ))}
              </View>
              <Text style={[theme.typography.mobileMeta, { color: colors.textMuted, marginTop: 8 }]}>
                {due.length} word{due.length === 1 ? '' : 's'} due — review them before they fade.
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Quiet entries — the existing learning utilities, one tap away */}
        <View style={{ marginTop: 28, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Pressable onPress={() => navigateToLessons()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Lessons</Text></Pressable>
          <Pressable onPress={() => navigateToGrammar()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Grammar</Text></Pressable>
          <Pressable onPress={() => navigateToAlphabet()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Alphabet</Text></Pressable>
          <Pressable onPress={() => navigateToNumbers()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Numbers</Text></Pressable>
          <Pressable onPress={() => navigateToConversation()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Conversation</Text></Pressable>
          {mistakeCodes.length > 0 ? (
            <Pressable onPress={() => navigateToMistakes()}><Text style={{ fontSize: 13, color: colors.status.error }}>Mistakes ({mistakeCodes.length})</Text></Pressable>
          ) : null}
          <Pressable onPress={() => navigateToImport()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Add a song</Text></Pressable>
        </View>
      </ScrollView>

      <SongTabBar activeId="today" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    ...theme.typography.mobileEyebrow,
    marginBottom: 8,
  },
  firstUseQuestion: {
    ...theme.typography.mobileItemTitle,
    fontSize: 20,
    marginBottom: 14,
  },
  primaryAction: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  actionLabel: {
    ...theme.typography.mobileAction,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
});
