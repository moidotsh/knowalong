// app/deck/[deckId]/section/[subDeckId].tsx
// Section (sub-deck) lessons. Lists a section's lessons in order with a
// HARD SEQUENTIAL LOCK: lesson N is locked until lesson N-1 is completed
// (the first lesson is always unlocked) — a learner can't absorb a whole
// verse/chorus at once. A collapsible lyric preview shows the lines the
// lessons build toward (joined via SubDeck.lyricSectionId).

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileSurface, MobileHeader, EmptyState } from '../../../../components/MobilePremium';
import { useAppTheme } from '../../../../context';
import { safeGoBack, navigateToLesson } from '../../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../../constants';
import { getDeck, getSubDeck, type SectionKind } from '../../../../utils/knowalong/fixtures/decks';
import { SVETOFOR_SONG } from '../../../../utils/knowalong/fixtures/svetoforSong';
import { buildSongSectionLessons } from '../../../../utils/knowalong/songDeck';
import { getSpine } from '../../../../utils/knowalong/spine';
import { getContext } from '../../../../utils/knowalong/contextProvider';
import { sectionProgress, isLessonUnlocked } from '../../../../utils/knowalong/progress';
import { classifyWord } from '../../../../utils/knowalong/mastery';
import { useLessonProgressStore } from '../../../../stores/lessonProgressStore';
import { useWordMasteryStore } from '../../../../stores/wordMasteryStore';
import { ConceptIcon } from '../../../../components/knowalong/ConceptIcon';

const SECTION_EYEBROW: Record<SectionKind, string> = {
  intro: 'Intro',
  verse: 'Verse',
  chorus: 'Chorus',
  bridge: 'Bridge',
  outro: 'Outro',
};

/** Strip edge/internal non-letters + lowercase, so a lyric token (with
 *  punctuation, capitalized) matches its `form`-keyed mastery. Case-insensitive
 *  for display (a sentence-capitalized word is "known" if its lowercase form is). */
function tokenKey(token: string): string {
  return token.replace(/[^а-яА-ЯёЁa-zA-Z]/g, '').toLowerCase();
}

export default function SectionLessonsScreen() {
  const { colors } = useAppTheme();
  const { deckId, subDeckId } = useLocalSearchParams<{ deckId: string; subDeckId: string }>();
  const completed = useLessonProgressStore((s) => s.completedLessonIds);
  const mastery = useWordMasteryStore((s) => s.mastery);
  const [showLyrics, setShowLyrics] = useState(false);

  const deck = getDeck(deckId ?? '');
  const subDeck = getSubDeck(deckId ?? '', subDeckId ?? '');

  if (!deck || !subDeck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Section not found" onBack={safeGoBack} />
        <EmptyState title="Section not found" message="This song section doesn't exist." />
      </SafeAreaView>
    );
  }

  // Song sections are dynamic (Phase 4): lessons generated from current mastery,
  // one arc per lyric target. Static decks use their authored lessons unchanged.
  const lessons = deckId === 'svetofor' ? buildSongSectionLessons(subDeck, mastery, getSpine(), getContext()) : subDeck.lessons;
  const progress = sectionProgress(lessons, completed);
  const lyricSection = subDeck.lyricSectionId
    ? SVETOFOR_SONG.sections.find((s) => s.id === subDeck.lyricSectionId)
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={subDeck.label} eyebrow={`${deck.title} · ${SECTION_EYEBROW[subDeck.kind]}`} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.body}>

        {/* Progress hero */}
        <MobileSurface padding={16}>
          <View style={styles.progressHeader}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{subDeck.label}</Text>
            <Text style={[styles.progressPct, { color: colors.brand }]}>{progress.pct}%</Text>
          </View>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            {progress.done}/{progress.total} lessons — finish one to unlock the next
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.15)', marginTop: 10 }}>
            <View style={{ height: '100%', width: `${progress.pct}%`, backgroundColor: colors.brand, borderRadius: 3 }} />
          </View>
        </MobileSurface>

        {/* Lyric preview (collapsible) — what these lessons build toward */}
        {lyricSection ? (
          <View style={{ marginTop: 12 }}>
            <Pressable onPress={() => setShowLyrics((v) => !v)}>
              <MobileSurface padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.lyricToggle, { color: colors.textSecondary }]}>
                    {showLyrics ? 'Hide' : 'Show'} lyrics
                  </Text>
                  <ConceptIcon name={showLyrics ? 'check' : 'book'} size={16} color={colors.textMuted} />
                </View>
                {showLyrics ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {lyricSection.lines.map((line) => (
                      <View key={line.ordinal} style={{ paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 20, flexWrap: 'wrap' }}>
                          {line.text.split(/\s+/).filter(Boolean).map((tok, i) => {
                            const known = classifyWord(mastery[tokenKey(tok)]) === 'graduated';
                            return (
                              <Text key={i} style={{ color: known ? colors.status.success : colors.textSecondary, opacity: known ? 1 : 0.45 }}>{tok} </Text>
                            );
                          })}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }}>{line.translation}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </MobileSurface>
            </Pressable>
          </View>
        ) : null}

        {/* Locked lesson list */}
        <View style={{ marginTop: 14 }}>
          {lessons.map((lesson, idx) => {
            const done = completed.includes(lesson.id);
            const unlocked = isLessonUnlocked(lessons, idx, completed);
            return (
              <Pressable
                key={lesson.id}
                disabled={!unlocked}
                onPress={() => navigateToLesson(lesson.id)}
                style={({ pressed }) => ({ opacity: !unlocked ? 0.45 : pressed ? 0.6 : 1, marginBottom: 8 })}
              >
                <MobileSurface padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.badge, {
                      backgroundColor: done ? colors.status.success + '15' : colors.cardAlt,
                      borderColor: done ? colors.status.success : unlocked ? colors.brand : colors.cardBorder,
                    }]}>
                      {done ? (
                        <ConceptIcon name="check" size={16} color={colors.status.success} />
                      ) : unlocked ? (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>{idx + 1}</Text>
                      ) : (
                        <ConceptIcon name="lock" size={15} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
                      <Text style={[styles.lessonSub, { color: colors.textMuted }]}>{lesson.subtitle}</Text>
                      <Text style={[styles.lessonMeta, { color: colors.textMuted }]}>
                        {lesson.steps.length} cards{!unlocked ? ' · locked' : ''}
                      </Text>
                    </View>
                    {unlocked ? <Text style={{ fontSize: 16, color: colors.brand }}>→</Text> : null}
                  </View>
                </MobileSurface>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  heroSub: { fontSize: 12, marginTop: 4 },
  progressPct: { fontSize: 14, fontWeight: '700' },
  lyricToggle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  badge: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  lessonTitle: { fontSize: 15, fontWeight: '600' },
  lessonSub: { fontSize: 12, marginTop: 2 },
  lessonMeta: { fontSize: 11, marginTop: 3 },
});
