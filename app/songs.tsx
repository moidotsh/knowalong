// app/songs.tsx
// Song library — a clean browse of imported songs with concept coverage
// + readiness. Each song card: title, sections, concepts known/total,
// "Learn" button. Prototype: shows the sample song + an empty state for
// user imports.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToImport, navigateToDeck } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { SAMPLE_SONG } from '../utils/knowalong/fixtures/sampleSong';
import { getDeck } from '../utils/knowalong/fixtures/decks';
import { SVETOFOR_SUBDECKS } from '../utils/knowalong/fixtures/svetoforFullDeck';
import { SVETOFOR_SONG } from '../utils/knowalong/fixtures/svetoforSong';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

export default function SongsScreen() {
  const { colors } = useAppTheme();
  const svetofor = getDeck('svetofor');
  // Song lessons are generated dynamically (Phase 4), so the deck carries no
  // static lesson count. Surface the lyric vocabulary size instead — a stable,
  // meaningful measure of what there is to learn.
  const songWords = new Set(SVETOFOR_SONG.sections.flatMap((s) => s.lines.flatMap((l) => l.words.map((w) => w.form)))).size;
  const totalConcepts = new Set(SAMPLE_SONG.sections.flatMap((s) => s.allConcepts)).size;
  const knownConcepts = new Set(SAMPLE_SONG.sections.flatMap((s) => s.knownConcepts)).size;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Songs" eyebrow="Learn from lyrics" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>

        {/* Светофор — real, playable song deck */}
        {svetofor ? (
          <Pressable onPress={() => navigateToDeck('svetofor')} style={{ borderRadius: 14, marginBottom: 12 }}>
            <MobileSurface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <ConceptIcon name={svetofor.icon} size={36} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{svetofor.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{SVETOFOR_SONG.artist}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.brandSoft }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand }}>{SVETOFOR_SUBDECKS.length} sections</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'center' }}>
                      {songWords} words
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
              </View>
            </MobileSurface>
          </Pressable>
        ) : null}

        {/* Demo song */}
        <Pressable onPress={() => safeGoBack()} style={{ borderRadius: 14 }}>
          <MobileSurface padding={18}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <ConceptIcon name="waves" size={36} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{SAMPLE_SONG.title}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{SAMPLE_SONG.artist}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.brandSoft }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand }}>{SAMPLE_SONG.sections.length} sections</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'center' }}>
                    {knownConcepts}/{totalConcepts} concepts known
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
            </View>
          </MobileSurface>
        </Pressable>

        {/* Progress bar */}
        <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.15)' }}>
          <View style={{ height: '100%', width: `${(knownConcepts / totalConcepts) * 100}%`, backgroundColor: colors.status.success, borderRadius: 4 }} />
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
          {Math.round((knownConcepts / totalConcepts) * 100)}% ready to learn
        </Text>

        {/* Empty state for user imports */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Your songs</Text>
          <Pressable onPress={() => navigateToImport()}>
            <MobileSurface padding={20}>
              <View style={{ alignItems: 'center' }}>
                <ConceptIcon name="book" size={36} color={colors.textMuted} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                  No songs imported yet. Paste lyrics to learn from them.
                </Text>
              </View>
            </MobileSurface>
          </Pressable>
        </View>

      </ScrollView>

      <MobileActionFooter>
        <MobilePrimaryButton variant="primary" onPress={() => navigateToImport()}>Import a song</MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}
