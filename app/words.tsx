// app/words.tsx
// WORDS — the song-first word surface (design doc §1.1). What the learner
// has met, joined with the songs it came from: due reviews first (issue
// words most-mistakes-first, then stale learning words — §1.1 Today's due
// set), then the saved words grouped by honest recall state. Explore-only:
// this surface explains, it never tests — practice stays in the capped
// runtime. The phrase dictionary (vocabulary) stays reachable as a quiet
// entry — learning utilities are kept, duplicate entry points retired.

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
} from '../components/MobilePremium';
import { SongTabBar } from '../components/knowalong';
import { useAppTheme } from '../context';
import { navigateToStudy, navigateToVocabulary } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { useWordMasteryStore } from '../stores/wordMasteryStore';
import { selectDueWords, selectKnownWords, type KnownWord, type RecallState } from '../utils/knowalong/song/selectors';
import { demoSongToCanonical } from '../utils/knowalong/song/demoSongAdapter';
import { isSpeechAvailable, speak } from '../utils/knowalong/tts';

const STATE_LABEL: Record<RecallState, string> = {
  new: 'New',
  learning: 'Still growing',
  issue: 'Needs work',
  graduated: 'Known',
};

function WordRow({ word }: { word: KnownWord }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wordRow}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[styles.wordForm, { color: colors.text }]}>{word.form}</Text>
          {word.songIds.length > 0 ? (
            <Text style={[styles.chip, { color: colors.textMuted }]}>· from a song</Text>
          ) : null}
        </View>
        {word.gloss ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{word.gloss}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {isSpeechAvailable() ? (
          <Pressable hitSlop={8} onPress={() => speak(word.form)}>
            <Text style={{ fontSize: 13, color: colors.brand }}>🔊</Text>
          </Pressable>
        ) : null}
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.cardAlt }}>
          <Text
            style={[
              styles.chip,
              {
                color:
                  word.state === 'graduated'
                    ? colors.brand
                    : word.state === 'issue'
                      ? colors.status.error
                      : colors.textSecondary,
              },
            ]}
          >
            {STATE_LABEL[word.state].toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WordsScreen() {
  const { colors } = useAppTheme();
  const mastery = useWordMasteryStore((s) => s.mastery);
  const [showAll, setShowAll] = useState(false);

  // The demo song is the only analyzed song today (library sources project
  // text-only lines until the analysis pipeline lands — Part D extends this
  // list; selectSongWords simply finds no words to join until then).
  const songs = useMemo(() => [demoSongToCanonical()], []);
  const due = useMemo(() => selectDueWords(mastery, songs), [mastery, songs]);
  const known = useMemo(() => selectKnownWords(mastery, songs), [mastery, songs]);
  const growing = known.filter((w) => w.state === 'learning' || w.state === 'issue');
  const graduated = known.filter((w) => w.state === 'graduated');
  const listed = showAll ? graduated : graduated.slice(0, 6);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Words" eyebrow="Learn from lyrics" />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.body}>
        {/* ── Due now ───────────────────────────────────────────────── */}
        {due.length > 0 ? (
          <Pressable onPress={navigateToStudy} style={({ pressed }) => ({ borderRadius: 14, opacity: pressed ? 0.9 : 1 })}>
            <MobileSurface padding={18}>
              <Text style={[styles.eyebrow, { color: colors.brand }]}>DUE NOW</Text>
              <Text style={[styles.dueCount, { color: colors.text }]}>
                {due.length} {due.length === 1 ? 'word' : 'words'} ready for review
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {due.slice(0, 4).map((w) => (
                  <View key={w.key} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.cardAlt }}>
                    <Text style={[styles.chip, { color: colors.textSecondary }]}>{w.form}</Text>
                  </View>
                ))}
                {due.length > 4 ? (
                  <Text style={[styles.chip, { color: colors.textMuted, alignSelf: 'center' }]}>
                    +{due.length - 4} more
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand, marginTop: 14 }}>
                PRACTISE DUE WORDS →
              </Text>
            </MobileSurface>
          </Pressable>
        ) : null}

        {/* ── Still growing ─────────────────────────────────────────── */}
        <View style={{ height: 20 }} />
        <MobileSectionEyebrow>Still growing</MobileSectionEyebrow>
        {growing.length > 0 ? (
          <MobileSurface padding={16}>
            {growing.slice(0, 8).map((w, i) => (
              <View key={w.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.cardAlt, marginTop: 10, paddingTop: 10 } : null}>
                <WordRow word={w} />
              </View>
            ))}
            {growing.length > 8 ? (
              <Text style={[styles.chip, { color: colors.textMuted, marginTop: 10 }]}>
                +{growing.length - 8} more growing
              </Text>
            ) : null}
          </MobileSurface>
        ) : (
          <MobileSurface padding={16}>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
              {known.length === 0
                ? 'Words you meet save themselves here — practise a passage to begin.'
                : 'Nothing waiting on you right now — keep exploring.'}
            </Text>
          </MobileSurface>
        )}

        {/* ── Known ─────────────────────────────────────────────────── */}
        {graduated.length > 0 ? (
          <>
            <View style={{ height: 20 }} />
            <MobileSectionEyebrow>Known</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              {listed.map((w, i) => (
                <View key={w.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.cardAlt, marginTop: 10, paddingTop: 10 } : null}>
                  <WordRow word={w} />
                </View>
              ))}
              {graduated.length > 6 ? (
                <Pressable hitSlop={8} onPress={() => setShowAll((v) => !v)} style={{ marginTop: 12 }}>
                  <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>
                    {showAll ? 'SHOW LESS' : `SHOW ALL (${graduated.length})`}
                  </Text>
                </Pressable>
              ) : null}
            </MobileSurface>
          </>
        ) : null}

        {/* ── Quiet entries ─────────────────────────────────────────── */}
        <View style={{ height: 20 }} />
        <Pressable onPress={navigateToVocabulary} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'flex-start' })}>
          <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.textSecondary }}>
            BROWSE ALL PHRASES →
          </Text>
        </Pressable>
      </ScrollView>

      <SongTabBar activeId="words" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 120 },
  eyebrow: { ...theme.typography.mobileEyebrow },
  dueCount: { ...theme.typography.mobileItemTitle, fontSize: 18, lineHeight: 24, fontFamily: theme.fonts.display, marginTop: 4 },
  chip: { fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: 0.5 },
  wordForm: { fontFamily: theme.fonts.display, fontSize: 15, lineHeight: 20 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
