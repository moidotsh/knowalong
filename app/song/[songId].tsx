// app/song/[songId].tsx
// SONG DETAIL — the song-first map of one song (design doc §1.1). The
// passage list is the honest state of the song: what supports assessed
// practice today (demo), what is readable-but-explorable, and what is text
// only (§1.4 Explore vs Practice; §1.5 never fake coverage). The learner can
// also promote a passage ("study this next") — Today follows that pointer.
// Both content origins project here through the canonical model: the demo
// song via `demoSongToCanonical`, library songs via `useSourceSong`.

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
} from '../../components/MobilePremium';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToSongSection, navigateToSubDeck } from '../../navigation';
import { useSongShelfStore } from '../../stores';
import { useDemoSong, useSourceSong } from '../../hooks/queries';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
import { DEMO_SONG_ID, demoSubDeckIdForSection } from '../../utils/knowalong/song/demoSongAdapter';
import type { CanonicalSong, SectionPractice } from '../../utils/knowalong/song/types';

/** Honest per-passage chips (§1.4) — never a fake readiness percentage. */
const PRACTICE_LABEL: Record<SectionPractice, string> = {
  supported: 'Practice ready',
  'explore-only': 'Explore',
  unavailable: 'Text only',
};

export default function SongDetailScreen() {
  const { colors } = useAppTheme();
  const { songId: rawId } = useLocalSearchParams<{ songId: string }>();
  const songId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isDemo = songId === DEMO_SONG_ID;

  const demoSong = useDemoSong();
  const librarySong = useSourceSong(isDemo ? null : (songId ?? null));
  const song: CanonicalSong | null = isDemo ? demoSong : librarySong;

  const setActiveSong = useSongShelfStore((s) => s.setActiveSong);
  const passagePriorities = useSongShelfStore((s) => s.passagePriorities);
  const priorityOrdinal = songId ? passagePriorities[songId] : undefined;

  // Opening a song makes it the one Today follows (§1.1 active song).
  useEffect(() => {
    if (songId) setActiveSong(songId);
  }, [songId, setActiveSong]);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={song?.title ?? 'Song'}
        eyebrow={song?.artist ?? 'Your songs'}
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.body}>
        {!song ? (
          <MobileSurface padding={18}>
            <Text style={{ fontFamily: theme.fonts.mono, fontSize: 13, color: colors.textMuted }}>
              {songId && !isDemo ? 'Loading song…' : 'This song is not on your shelf.'}
            </Text>
          </MobileSurface>
        ) : (
          <>
            {/* ── Song plate ─────────────────────────────────────────── */}
            <MobileSurface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <ConceptIcon name="waves" size={40} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{song.title}</Text>
                  {song.artist ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{song.artist}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <Text style={[styles.stat, { color: colors.brand }]}>
                  {song.practice.supportedSections}/{song.practice.totalSections} passages practice-ready
                </Text>
                <Text style={[styles.stat, { color: colors.textMuted }]}>
                  {song.practice.translatedLines}/{song.practice.totalLines} lines translated
                </Text>
              </View>
              {song.statusNote ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, fontStyle: 'italic' }}>
                  {song.statusNote}
                </Text>
              ) : null}
              {song.prep !== 'ready' && song.practice.supportedSections === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                  Practice arrives when this song finishes processing — every passage is open to explore meanwhile.
                </Text>
              ) : null}
            </MobileSurface>

            {/* ── Passages ───────────────────────────────────────────── */}
            <View style={{ height: 20 }} />
            <MobileSectionEyebrow>Passages</MobileSectionEyebrow>
            {song.sections.map((section) => {
              const isPriority = priorityOrdinal === section.ordinal;
              const practicable = song.origin === 'demo' && section.practice === 'supported';
              return (
                <Pressable
                  key={section.id}
                  onPress={() => navigateToSongSection(song.id, section.id)}
                  style={({ pressed }) => ({ borderRadius: 14, opacity: pressed ? 0.9 : 1, marginBottom: 10 })}
                >
                  <MobileSurface padding={16}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={[styles.sectionLabel, { color: colors.text }]}>
                            {String(section.ordinal).padStart(2, '0')} · {section.label}
                          </Text>
                          {isPriority ? (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.brandSoft }}>
                              <Text style={[styles.chip, { color: colors.brand }]}>UP NEXT</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.chip, { color: colors.textMuted, marginTop: 4 }]}>
                          {section.lines.length} lines · {PRACTICE_LABEL[section.practice]}
                        </Text>
                      </View>
                      {practicable ? (
                        <Pressable
                          hitSlop={8}
                          onPress={() => navigateToSubDeck(DEMO_SONG_ID, demoSubDeckIdForSection(section.id))}
                          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                        >
                          <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>
                            PRACTISE →
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={{ fontSize: 16, color: colors.brand }}>→</Text>
                      )}
                    </View>
                  </MobileSurface>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontFamily: theme.fonts.display, fontSize: 20, lineHeight: 26 },
  stat: { fontFamily: theme.fonts.mono, fontSize: 12 },
  sectionLabel: { fontFamily: theme.fonts.display, fontSize: 15, lineHeight: 20 },
  chip: { fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: 0.5 },
});
