// app/song/[songId]/section/[sectionId].tsx
// PASSAGE READER — the Explore surface (design doc §1.4). The lyric is shown
// exactly as preserved (never rewritten); analyzed words sit beneath each
// line as tappable chips that open a gloss sheet. Listen is unassessed —
// it explains, it never tests. Assessed practice stays where it belongs:
// the burden-capped deck runtime, reached through the explicit Practise CTA
// (demo song only until validated packs land — §1.5 never fakes coverage).
// The learner can promote the passage ("study this next"); Today follows.

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSheet,
  MobileSectionEyebrow,
  MobileActionFooter,
  MobilePrimaryButton,
} from '../../../../components/MobilePremium';
import { useAppTheme } from '../../../../context';
import { safeGoBack, navigateToSubDeck } from '../../../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../../../constants';
import { useSongShelfStore } from '../../../../stores';
import { useWordMasteryStore } from '../../../../stores/wordMasteryStore';
import { useDemoSong, useSourceSong } from '../../../../hooks/queries';
import { DEMO_SONG_ID, demoSubDeckIdForSection } from '../../../../utils/knowalong/song/demoSongAdapter';
import { classifyWord, wordKey } from '../../../../utils/knowalong/mastery';
import { isSpeechAvailable, prefetchAudio, speak } from '../../../../utils/knowalong/tts';
import type { CanonicalSection, CanonicalSong, CanonicalWord, CanonicalLine } from '../../../../utils/knowalong/song/types';
import type { MasteryMap } from '../../../../utils/knowalong/mastery';
import type { RecallState } from '../../../../utils/knowalong/song/selectors';

/** Display-only difficulty caps (§1.4: a hint, never a gate). */
const DIFFICULTY_COLOR = { easy: 'success', medium: 'warning', hard: 'error' } as const;

/** Honest recall chips for the gloss sheet (§1.4 Explore explains). */
const RECALL_LABEL: Record<RecallState, string> = {
  new: 'NEW TO YOU',
  learning: 'STILL GROWING',
  issue: 'NEEDS WORK',
  graduated: 'KNOWN',
};

/** A demo line is learned when every analyzed word in it is graduated
 *  (the same gate the culminating lines use). */
function lineLearned(line: CanonicalLine, mastery: MasteryMap): boolean {
  return !!line.words && line.words.length > 0 && line.words.every((w) => classifyWord(mastery[wordKey(w.form)]) === 'graduated');
}

export default function PassageReaderScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ songId: string; sectionId: string }>();
  const songId = Array.isArray(params.songId) ? params.songId[0] : params.songId;
  const sectionId = Array.isArray(params.sectionId) ? params.sectionId[0] : params.sectionId;
  const isDemo = songId === DEMO_SONG_ID;

  const demoSong = useDemoSong();
  const librarySong = useSourceSong(isDemo ? null : (songId ?? null));
  const song: CanonicalSong | null = isDemo ? demoSong : librarySong;
  const section: CanonicalSection | null = useMemo(
    () => song?.sections.find((s) => s.id === sectionId) ?? null,
    [song, sectionId],
  );

  const mastery = useWordMasteryStore((s) => s.mastery);

  const setPassagePriority = useSongShelfStore((s) => s.setPassagePriority);
  const passagePriorities = useSongShelfStore((s) => s.passagePriorities);
  const isPriority = !!song && !!section && passagePriorities[song.id] === section.ordinal;

  const [sheetWord, setSheetWord] = useState<CanonicalWord | null>(null);
  const [listening, setListening] = useState(false);

  // Preload the passage's speech in two waves (headers first) so Listen
  // plays instantly without blocking first paint.
  useEffect(() => {
    if (!section) return;
    const texts = section.lines.map((l) => l.text);
    if (!texts.length) return;
    void prefetchAudio(texts.slice(0, 4)).then(() => {
      void prefetchAudio(texts.slice(4));
    });
  }, [section]);

  const playPassage = () => {
    if (!section || !isSpeechAvailable()) return;
    setListening(true);
    for (const line of section.lines) speak(line.text);
    // The tts queue drains sequentially; clear the flag after the last line.
    const ms = section.lines.reduce((n, l) => n + Math.max(1400, l.text.length * 90), 0);
    setTimeout(() => setListening(false), ms);
  };

  const practicable = song?.origin === 'demo' && section?.practice === 'supported';
  const learnedCount = section ? section.lines.filter((l) => lineLearned(l, mastery)).length : 0;

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={section?.label ?? 'Passage'}
        eyebrow={song?.title ?? 'Song'}
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.body}>
        {!song ? (
          <MobileSurface padding={18}>
            <Text style={{ fontFamily: theme.fonts.mono, fontSize: 13, color: colors.textMuted }}>
              {songId && !isDemo ? 'Loading song…' : 'This song is not on your shelf.'}
            </Text>
          </MobileSurface>
        ) : !section ? (
          <MobileSurface padding={18}>
            <Text style={{ fontFamily: theme.fonts.mono, fontSize: 13, color: colors.textMuted }}>
              This passage is not part of the song.
            </Text>
          </MobileSurface>
        ) : (
          <>
            {/* ── Passage plate ──────────────────────────────────────── */}
            <MobileSurface padding={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={playPassage}
                  disabled={!isSpeechAvailable()}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: listening ? colors.brandSoft : 'transparent',
                    opacity: pressed || !isSpeechAvailable() ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14 }}>{listening ? '⏸' : '▶'}</Text>
                  <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>
                    {listening ? 'PLAYING' : 'LISTEN'}
                  </Text>
                </Pressable>
                <Text style={[styles.chip, { color: colors.textMuted }]}>
                  Listen is never tested — it just explains.
                </Text>
              </View>
              {section.practice !== 'supported' ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>
                  {section.practice === 'explore-only'
                    ? 'Practice is being prepared for this passage — explore freely meanwhile.'
                    : 'Text only for now — no practice prepared for this passage yet.'}
                </Text>
              ) : null}
              {isPriority ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.brandSoft, alignSelf: 'flex-start', marginTop: 10 }}>
                  <Text style={[styles.chip, { color: colors.brand }]}>YOUR NEXT PASSAGE</Text>
                </View>
              ) : null}
            </MobileSurface>

            {/* ── Lines ──────────────────────────────────────────────── */}
            <View style={{ height: 18 }} />
            <MobileSectionEyebrow>Lyrics</MobileSectionEyebrow>
            {section.lines.map((line) => (
              <MobileSurface key={line.ordinal} padding={14} style={styles.lineCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={[styles.lineNo, { color: colors.textMuted }]}>
                    {String(line.ordinal).padStart(2, '0')}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[styles.lineText, { color: colors.text }]}>{line.text}</Text>
                      {isSpeechAvailable() ? (
                        <Pressable hitSlop={8} onPress={() => speak(line.text)}>
                          <Text style={{ fontSize: 13, color: colors.brand }}>🔊</Text>
                        </Pressable>
                      ) : null}
                      {lineLearned(line, mastery) ? (
                        <Text style={[styles.chip, { color: colors.status.success }]}>✓ LEARNED</Text>
                      ) : null}
                      {line.difficulty ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.brandSoft }}>
                          <Text style={[styles.chip, { color: colors.status[DIFFICULTY_COLOR[line.difficulty]] }]}>
                            {line.difficulty.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {line.translation ? (
                      <Text style={[styles.translation, { color: colors.textSecondary }]}>{line.translation}</Text>
                    ) : null}
                    {/* Word chips — Explore explains; tapping never scores. */}
                    {line.words && line.words.length > 0 ? (
                      <View style={styles.wordRow}>
                        {line.words.map((w, i) => (
                          <Pressable
                            key={`${w.form}-${i}`}
                            onPress={() => setSheetWord(w)}
                            style={({ pressed }) => [styles.wordChip, { opacity: pressed ? 0.7 : 1, borderColor: colors.mobilePremium.hairlineBorder, backgroundColor: colors.cardAlt }]}
                          >
                            <Text style={{ fontSize: 13, color: colors.text }}>{w.form}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.chip, { color: colors.textMuted, marginTop: 6 }]}>
                        No word analysis for this line yet.
                      </Text>
                    )}
                  </View>
                </View>
              </MobileSurface>
            ))}

            {/* ── Promote to Today ──────────────────────────────────── */}
            <View style={{ height: 18 }} />
            <Pressable
              onPress={() => song && section && setPassagePriority(song.id, section.ordinal)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, alignSelf: 'flex-start' })}
            >
              <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>
                {isPriority ? '✓ SET AS YOUR NEXT PASSAGE' : 'STUDY THIS PASSAGE NEXT'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Practise — the only assessed path, routed to the capped runtime. */}
      {practicable && section ? (
        <MobileActionFooter
          primary={{
            children: 'Practise this passage',
            onPress: () => navigateToSubDeck(DEMO_SONG_ID, demoSubDeckIdForSection(section.id)),
          }}
          progressText={`${learnedCount}/${section.lines.length} lines learned`}
        />
      ) : null}

      {/* Word gloss sheet — Explore mode: explains, never scores. */}
      <MobileSheet open={sheetWord !== null} onOpenChange={(open) => !open && setSheetWord(null)} title={sheetWord?.form}>
        {sheetWord ? (
          <View style={{ paddingBottom: 24 }}>
            <Text style={[styles.sheetForm, { color: colors.text }]}>{sheetWord.form}</Text>
            {sheetWord.gloss ? (
              <Text style={{ fontSize: 16, color: colors.text, marginTop: 6 }}>{sheetWord.gloss}</Text>
            ) : (
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>
                No gloss yet — this word joins practice once analysis covers it.
              </Text>
            )}
            {sheetWord.role ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.brandSoft, alignSelf: 'flex-start', marginTop: 12 }}>
                <Text style={[styles.chip, { color: colors.brand }]}>{sheetWord.role.toUpperCase()}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
              {(() => {
                const rec = mastery[wordKey(sheetWord.form)];
                const state = classifyWord(rec);
                return (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.cardAlt }}>
                    <Text style={[styles.chip, { color: colors.textSecondary }]}>{RECALL_LABEL[state]}</Text>
                  </View>
                );
              })()}
              {isSpeechAvailable() ? (
                <Pressable onPress={() => speak(sheetWord.form)} hitSlop={8}>
                  <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>▶ HEAR IT</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </MobileSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 120 },
  chip: { fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: 0.5 },
  lineCard: { marginBottom: 10 },
  lineNo: { fontFamily: theme.fonts.mono, fontSize: 12, marginTop: 3 },
  lineText: { fontFamily: theme.fonts.display, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  translation: { fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  wordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  wordChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  sheetForm: { fontFamily: theme.fonts.display, fontSize: 22 },
});
