// app/source/[id]/learn.tsx
// Lyric learning — the product's unique differentiator. Shows each song
// section (verse/chorus/bridge) with its CLCCs highlighted: known concepts
// (green checkmark) vs new ones (blue). The learner studies the new
// concepts in context of the lyric lines. This is the "learn Sans Logique"
// vision: import a song → see which concepts each section needs → study
// them.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../../components/MobilePremium';
import { useAppTheme } from '../../../context';
import { safeGoBack, navigateToStudy } from '../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../constants';
import { SAMPLE_SONG, type SongSection } from '../../../utils/knowalong/fixtures/sampleSong';
import { LEARNING_ITEMS } from '../../../utils/knowalong/fixtures/learningItems';
import { ConceptIcon } from '../../../components/knowalong/ConceptIcon';
import { ITEM_ICONS, type IconName } from '../../../utils/knowalong/icons';

export default function SongLearnScreen() {
  const { colors } = useAppTheme();
  const [activeSection, setActiveSection] = useState(0);
  const section = SAMPLE_SONG.sections[activeSection];

  const conceptLookup = (code: string) => LEARNING_ITEMS.find((i) => i.id === code);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={SAMPLE_SONG.title} eyebrow="Learn from lyrics" onBack={safeGoBack} />

      {/* Section tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        {SAMPLE_SONG.sections.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => setActiveSection(i)}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2,
              borderColor: i === activeSection ? colors.brand : colors.cardBorder,
              backgroundColor: i === activeSection ? colors.brand + '12' : colors.cardAlt,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: i === activeSection ? colors.brand : colors.textSecondary }}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>

        {/* Concept summary */}
        <MobileSurface padding={16}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Concepts in this section
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {section.allConcepts.map((code) => {
              const item = conceptLookup(code);
              const known = section.knownConcepts.includes(code);
              return (
                <View key={code} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: known ? colors.status.success + '40' : colors.brand + '40',
                  backgroundColor: known ? colors.status.success + '10' : colors.brand + '10',
                }}>
                  {ITEM_ICONS[code] ? (
                    <ConceptIcon name={ITEM_ICONS[code] as IconName} size={14} color={known ? colors.status.success : colors.brand} />
                  ) : null}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: known ? colors.status.success : colors.brand }}>
                    {item?.surfaceForm ?? code}
                  </Text>
                  <ConceptIcon name={known ? 'check' : 'sparkles'} size={12} color={known ? colors.status.success : colors.brand} />
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
            {section.knownConcepts.filter((c) => section.allConcepts.includes(c)).length} known · {section.newConcepts.length} to learn
          </Text>
        </MobileSurface>

        {/* Lyric lines with concept highlighting */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {section.lines.map((line) => (
            <MobileSurface key={line.ordinal} padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{line.ordinal}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, lineHeight: 24 }}>
                    {line.text}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                    {line.translation}
                  </Text>
                  {/* Concept chips for this line */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {line.concepts.map((code) => {
                      const item = conceptLookup(code);
                      const known = section.knownConcepts.includes(code);
                      return (
                        <View key={code} style={{
                          paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4,
                          backgroundColor: known ? colors.status.success + '15' : colors.brand + '15',
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: known ? colors.status.success : colors.brand }}>
                            {item?.meaning ?? code}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </MobileSurface>
          ))}
        </View>

        {/* New concepts to study */}
        {section.newConcepts.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
              New concepts to learn:
            </Text>
            {section.newConcepts.map((code) => {
              const item = conceptLookup(code);
              if (!item) return null;
              return (
                <Pressable key={code} onPress={() => navigateToStudy()} style={{ marginBottom: 8, borderRadius: 14 }}>
                  <MobileSurface padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {ITEM_ICONS[code] ? (
                        <ConceptIcon name={ITEM_ICONS[code] as IconName} size={28} color={colors.brand} />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{item.surfaceForm}</Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.meaning}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>Study →</Text>
                    </View>
                  </MobileSurface>
                </Pressable>
              );
            })}
          </View>
        ) : null}

      </ScrollView>

      <MobileActionFooter>
        <MobilePrimaryButton variant="primary" onPress={() => navigateToStudy()}>
          Study new concepts ({section.newConcepts.length})
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}
