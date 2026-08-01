// app/source/[id]/svetofor.tsx
// "Светофор" lesson — a real Mnogoznaal song broken into sections with
// progressive CLCC + vocabulary learning. Each section shows:
// - Its lyric lines with per-word analysis (known vs new, color-coded)
// - New vocabulary to learn before reading the section
// - A "study" CTA for the new words
// - A running cumulative word count (how far the learner has come)
//
// The flow: Intro (4 new words) → Verse 1 (34 new) → Chorus (22 new) →
// Verse 2 (16 new) → Outro (6 new). By the end: 82 words mastered.

import React, { useState, useRef, useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../../components/MobilePremium';
import { useAppTheme } from '../../../context';
import { safeGoBack, navigateToStudy } from '../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../constants';
import { SVETOFOR_SONG, type LyricWord, type SongSection } from '../../../utils/knowalong/fixtures/svetoforSong';
import { ConceptIcon } from '../../../components/knowalong/ConceptIcon';

function wordColor(colors: ReturnType<typeof useAppTheme>['colors'], word: LyricWord): string {
  if (word.isKnown) return colors.status.success;
  if (word.isNew) return colors.brand;
  return colors.textSecondary;
}

function difficultyTone(d: 'easy' | 'medium' | 'hard'): string {
  return d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴';
}

export default function SvetoforLessonScreen() {
  const { colors } = useAppTheme();
  const [activeSection, setActiveSection] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const section = SVETOFOR_SONG.sections[activeSection];
  const totalSections = SVETOFOR_SONG.sections.length;
  const isLast = activeSection >= totalSections - 1;

  const handleNext = () => {
    if (!isLast) {
      setActiveSection((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={SVETOFOR_SONG.title}
        eyebrow={`${SVETOFOR_SONG.artist} · ${section.label}`}
        onBack={safeGoBack}
      />

      {/* Section progress dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 8 }}>
        {SVETOFOR_SONG.sections.map((s, i) => (
          <Pressable key={s.id} onPress={() => { setActiveSection(i); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}>
            <View style={{
              width: i === activeSection ? 24 : 8, height: 8, borderRadius: 4,
              backgroundColor: i === activeSection ? colors.brand : i < activeSection ? colors.brand + '40' : colors.cardBorder,
            }} />
          </Pressable>
        ))}
      </View>

      <ScrollView ref={scrollRef} style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 }}>

        {/* Section intro */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {section.kind}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 }}>{section.label}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            {section.newWords.length} new word{section.newWords.length === 1 ? '' : 's'} · {section.cumulativeWords} total
          </Text>
        </View>

        {/* New vocabulary — learn before reading */}
        {section.newWords.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              New vocabulary
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {section.newWords.slice(0, 16).map((word) => (
                <View key={word} style={{
                  paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                  backgroundColor: colors.brand + '12', borderWidth: 1, borderColor: colors.brand + '30',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>{word}</Text>
                </View>
              ))}
              {section.newWords.length > 16 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, alignSelf: 'center' }}>+{section.newWords.length - 16} more</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Lyric lines with word-level analysis */}
        <View style={{ gap: 12 }}>
          {section.lines.map((line) => (
            <MobileSurface key={line.ordinal} padding={16}>
              {/* Difficulty + ordinal */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{line.ordinal}</Text>
                <Text style={{ fontSize: 10 }}>{difficultyTone(line.difficulty)}</Text>
              </View>

              {/* Russian text — words color-coded */}
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, lineHeight: 26 }}>
                {line.words.map((w, i) => (
                  <Text key={i}>
                    <Text style={{ color: wordColor(colors, w), fontWeight: w.isNew ? '700' : w.isKnown ? '500' : '400' }}>
                      {w.form}
                    </Text>{' '}
                  </Text>
                ))}
              </Text>

              {/* Translation */}
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' }}>
                {line.translation}
              </Text>

              {/* Word-by-word breakdown — collapsible feel (always shown for prototype) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                {line.words.map((w, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: wordColor(colors, w) }}>{w.form}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{w.gloss}</Text>
                    {i < line.words.length - 1 ? <Text style={{ fontSize: 10, color: colors.textMuted, marginHorizontal: 2 }}>·</Text> : null}
                  </View>
                ))}
              </View>

              {/* Known/New markers */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: colors.status.success }}>
                  ● {line.words.filter(w => w.isKnown).length} known
                </Text>
                <Text style={{ fontSize: 10, color: colors.brand }}>
                  ● {line.words.filter(w => w.isNew).length} new
                </Text>
              </View>
            </MobileSurface>
          ))}
        </View>

      </ScrollView>

      <MobileActionFooter>
        <MobilePrimaryButton variant="primary" onPress={() => navigateToStudy()}>
          Study {section.newWords.length} new word{section.newWords.length === 1 ? '' : 's'}
        </MobilePrimaryButton>
        {!isLast ? (
          <MobilePrimaryButton variant="ghost" onPress={handleNext}>
            {SVETOFOR_SONG.sections[activeSection + 1]?.label} →
          </MobilePrimaryButton>
        ) : (
          <MobilePrimaryButton variant="ghost" onPress={() => safeGoBack()}>
            Done
          </MobilePrimaryButton>
        )}
      </MobileActionFooter>
    </SafeAreaView>
  );
}
