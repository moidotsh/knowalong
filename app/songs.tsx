// app/songs.tsx
// MY SONGS — the song-first shelf (design doc §1.1). The demo song is
// pinned first (playable today); imported songs follow with their honest
// prep state — never a fake progress bar for an unanalyzed song (§1.5).
// Archived songs leave the shelf (restorable from Profile). Pressing a row
// activates the song (Today follows it) and opens its detail surface.
// The old SAMPLE_SONG fixture card retired here — it duplicated the demo
// song's entry point without being playable.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { SongTabBar } from '../components/knowalong';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { useAppTheme } from '../context';
import { navigateToImport, navigateToSong } from '../navigation';
import { useSongShelfStore } from '../stores';
import { useDemoSong, useSongLibrarySourceIds, useSourceSong } from '../hooks/queries';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import type { CanonicalSong, SongPrep } from '../utils/knowalong/song/types';

/** Honest shelf chips (§1.5) — what the learner can do right now. */
const PREP_LABEL: Record<SongPrep, string> = {
  ready: 'Playable today',
  partial: 'Readable · practice pending',
  preparing: 'Preparing',
  archived: 'Archived',
};

function songWordCount(song: CanonicalSong): number {
  const forms = new Set<string>();
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const word of line.words ?? []) forms.add(word.form);
    }
  }
  return forms.size;
}

function SongRow({
  song,
  icon,
  active,
  onOpen,
}: {
  song: CanonicalSong;
  icon: 'waves' | 'book';
  active: boolean;
  onOpen: () => void;
}) {
  const { colors } = useAppTheme();
  const words = songWordCount(song);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => ({ borderRadius: 14, opacity: pressed ? 0.9 : 1 })}>
      <MobileSurface padding={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <ConceptIcon name={icon} size={36} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
              {active ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.brandSoft }}>
                  <Text style={[styles.chip, { color: colors.brand }]}>ON TODAY</Text>
                </View>
              ) : null}
            </View>
            {song.artist ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{song.artist}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.brandSoft }}>
                <Text style={[styles.chip, { color: colors.brand }]}>{song.practice.totalSections} sections</Text>
              </View>
              <Text style={[styles.chip, { color: colors.textMuted, alignSelf: 'center' }]}>
                {words > 0 ? `${words} words` : `${song.practice.translatedLines}/${song.practice.totalLines} lines translated`}
              </Text>
              <Text style={[styles.chip, { color: song.prep === 'ready' ? colors.status.success : colors.textMuted, alignSelf: 'center' }]}>
                {PREP_LABEL[song.prep]}
              </Text>
            </View>
            {song.statusNote ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>{song.statusNote}</Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
        </View>
      </MobileSurface>
    </Pressable>
  );
}

/** A library row — projects its source into the canonical model, loading quietly. */
function LibrarySongRow({ sourceId, active, onOpen }: { sourceId: string; active: boolean; onOpen: () => void }) {
  const { colors } = useAppTheme();
  const song = useSourceSong(sourceId);
  if (!song) {
    return (
      <MobileSurface padding={18}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Loading song…</Text>
      </MobileSurface>
    );
  }
  return <SongRow song={song} icon="book" active={active} onOpen={onOpen} />;
}

export default function SongsScreen() {
  const { colors } = useAppTheme();
  const demoSong = useDemoSong();
  const sourceIds = useSongLibrarySourceIds();
  const activeSongId = useSongShelfStore((s) => s.activeSongId);
  const archivedSongIds = useSongShelfStore((s) => s.archivedSongIds);
  const setActiveSong = useSongShelfStore((s) => s.setActiveSong);

  const openSong = (songId: string) => {
    setActiveSong(songId);
    navigateToSong(songId);
  };

  const visibleSourceIds = sourceIds.filter((id) => !archivedSongIds.includes(id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="My Songs" eyebrow="Learn from lyrics" />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}>
        {/* The demo song — pinned, playable today (§1.2 authorized demo) */}
        <SongRow
          song={demoSong}
          icon="waves"
          active={activeSongId === demoSong.id}
          onOpen={() => openSong(demoSong.id)}
        />

        {/* Imported songs — honest prep states, §1.5 */}
        <Text style={[styles.eyebrow, { color: colors.textMuted, marginTop: 24, marginBottom: 8 }]}>Your songs</Text>
        {visibleSourceIds.length === 0 ? (
          <Pressable onPress={() => navigateToImport()}>
            <MobileSurface padding={20}>
              <View style={{ alignItems: 'center' }}>
                <ConceptIcon name="book" size={36} color={colors.textMuted} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                  Nothing here yet. Start from the included demo song or paste lyrics yourself.
                </Text>
              </View>
            </MobileSurface>
          </Pressable>
        ) : (
          <View style={{ gap: 12 }}>
            {visibleSourceIds.map((id) => (
              <LibrarySongRow key={id} sourceId={id} active={activeSongId === id} onOpen={() => openSong(id)} />
            ))}
          </View>
        )}

        {archivedSongIds.length > 0 ? (
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16 }}>
            {archivedSongIds.length} archived — restore from your Profile.
          </Text>
        ) : null}
      </ScrollView>

      <SongTabBar activeId="songs" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Song titles ride the display face — a song is a line on the network.
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    fontFamily: theme.fonts.display,
    flexShrink: 1,
  },
  chip: {
    ...theme.typography.mobileEyebrow,
    fontSize: 11,
  },
  eyebrow: {
    ...theme.typography.mobileEyebrow,
  },
});
