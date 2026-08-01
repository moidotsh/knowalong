// app/concept/[code].tsx
// Concept detail — deep dive on one CLCC. Shows the concept's realization
// (surface form, gloss, IPA, transliteration), word breakdown, paradigm
// context, example sentences, where it appears in songs (prototype),
// prerequisites, + what it enables.

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobileSectionEyebrow } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToStudy } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { LEARNING_ITEMS } from '../../utils/knowalong/fixtures/learningItems';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../../utils/knowalong/icons';

export default function ConceptDetailScreen() {
  const { colors } = useAppTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const item = LEARNING_ITEMS.find((i) => i.id === code);

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Concept not found" onBack={safeGoBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title={item.meaning} eyebrow="Concept" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {/* Hero */}
        <MobileSurface padding={28}>
          <View style={{ alignItems: 'center' }}>
            <ConceptIcon name={ITEM_ICONS[item.id] ?? 'star'} size={56} color={colors.brand} />
            <Text style={{ fontSize: 40, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12 }}>
              {item.surfaceForm}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
              {item.transliteration}
            </Text>
            {item.ipa ? (
              <Text style={{ fontSize: 14, color: colors.textMuted, fontFamily: 'monospace', marginTop: 4 }}>
                /{item.ipa}/
              </Text>
            ) : null}
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.brand, marginTop: 12 }}>
              "{item.meaning}"
            </Text>
          </View>
        </MobileSurface>

        {/* Word breakdown */}
        <View style={{ marginTop: 20 }}>
          <MobileSectionEyebrow>Word breakdown</MobileSectionEyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {item.words.map((w, i) => (
              <View key={i} style={{
                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2,
                borderColor: colors.cardBorder, backgroundColor: colors.cardAlt, alignItems: 'center', minWidth: 72,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{w.gloss}</Text>
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' }}>{w.role}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Grammar note */}
        {item.note ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>Grammar note</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>{item.note}</Text>
            </MobileSurface>
          </View>
        ) : null}

        {/* Construction (if non-obvious) */}
        {item.construction ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>How it works</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{item.construction.intro}</Text>
              <View style={{ marginTop: 12, gap: 6 }}>
                {item.construction.breakdown.map((part, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand }}>{part.form}</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>=</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{part.literal}</Text>
                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.textMuted }}>({part.note})</Text>
                  </View>
                ))}
              </View>
            </MobileSurface>
          </View>
        ) : null}

        {/* Context sentence */}
        {item.contextSentence ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>In context</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                {item.contextSentence.ru}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
                {item.contextSentence.en}
              </Text>
            </MobileSurface>
          </View>
        ) : null}

        {/* Dependencies */}
        {item.buildsOn.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>Builds on</MobileSectionEyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {item.buildsOn.map((depId) => {
                const dep = LEARNING_ITEMS.find((i) => i.id === depId);
                return (
                  <View key={depId} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.status.success + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ConceptIcon name="check" size={14} color={colors.status.success} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.success }}>{dep?.surfaceForm ?? depId}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
