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
import { SCREEN_BODY_STYLE, theme } from '../../constants';
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
            <Text style={{ fontSize: 40, lineHeight: 46, fontWeight: '700', fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center', marginTop: 12 }}>
              {item.surfaceForm}
            </Text>
            <Text style={{ ...theme.typography.mobileLedger, fontSize: 13, lineHeight: 17, color: colors.textSecondary, marginTop: 4 }}>
              {item.transliteration}
            </Text>
            {item.ipa ? (
              <Text style={{ ...theme.typography.mobileLedger, fontSize: 13, lineHeight: 17, color: colors.textMuted, marginTop: 4 }}>
                /{item.ipa}/
              </Text>
            ) : null}
            <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 20, lineHeight: 26, fontFamily: theme.fonts.display, color: colors.brand, marginTop: 12 }}>
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
                <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 18, lineHeight: 22, fontFamily: theme.fonts.display, color: colors.text }}>{w.form}</Text>
                <Text style={{ ...theme.typography.mobileLedger, fontSize: 10, lineHeight: 13, color: colors.textMuted, marginTop: 2 }}>{w.gloss}</Text>
                <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 9, lineHeight: 12, color: colors.textMuted, marginTop: 3, textTransform: 'uppercase' }}>{w.role}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Grammar note */}
        {item.note ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>Grammar note</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>{item.note}</Text>
            </MobileSurface>
          </View>
        ) : null}

        {/* Construction (if non-obvious) */}
        {item.construction ? (
          <View style={{ marginTop: 20 }}>
            <MobileSectionEyebrow>How it works</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={{ ...theme.typography.mobileBody, color: colors.text }}>{item.construction.intro}</Text>
              <View style={{ marginTop: 12, gap: 6 }}>
                {item.construction.breakdown.map((part, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 16, lineHeight: 21, fontFamily: theme.fonts.display, color: colors.brand }}>{part.form}</Text>
                    <Text style={{ ...theme.typography.mobileBody, color: colors.textMuted }}>=</Text>
                    <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>{part.literal}</Text>
                    <Text style={{ ...theme.typography.mobileLedger, fontSize: 11, lineHeight: 15, color: colors.textMuted }}>({part.note})</Text>
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
              <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 18, lineHeight: 24, fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center' }}>
                {item.contextSentence.ru}
              </Text>
              <Text style={{ ...theme.typography.mobileBody, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
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
                    <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 13, lineHeight: 17, color: colors.status.success }}>{dep?.surfaceForm ?? depId}</Text>
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
