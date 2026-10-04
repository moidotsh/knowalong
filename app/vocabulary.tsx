// app/vocabulary.tsx
// Vocabulary browser — all learned phrases as a searchable dictionary.
// Each entry shows the Lucide icon, surface form, transliteration, gloss,
// + a context sentence. Tap to hear pronunciation (prototype: no audio).

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { MobileInput } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToStudy } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';
import { ITEM_ICONS, type IconName } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

export default function VocabularyScreen() {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = LEARNING_ITEMS.filter(
    (item) =>
      item.surfaceForm.toLowerCase().includes(search.toLowerCase()) ||
      item.meaning.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Vocabulary" eyebrow={`${LEARNING_ITEMS.length} phrases`} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        <MobileInput
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search phrases..."
          style={{ marginBottom: 16 }}
        />

        <View style={{ gap: 10 }}>
          {filtered.map((item) => {
            const iconName = ITEM_ICONS[item.id] ?? 'star';
            return (
              <Pressable key={item.id} onPress={() => navigateToStudy()} style={({ pressed }) => [{ borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`${item.surfaceForm} — ${item.meaning}`}>
                <MobileSurface padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <ConceptIcon name={iconName} size={28} color={colors.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 18, lineHeight: 24, fontFamily: theme.fonts.display, color: colors.text }}>
                        {item.surfaceForm}
                      </Text>
                      <Text style={{ ...theme.typography.mobileBody, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 1 }}>
                        {item.transliteration} · {item.meaning}
                      </Text>
                      {item.contextSentence ? (
                        <Text style={{ ...theme.typography.mobileLedger, fontSize: 11, lineHeight: 15, color: colors.textMuted, marginTop: 4 }}>
                          {item.contextSentence.ru} — {item.contextSentence.en}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </MobileSurface>
              </Pressable>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <Text style={{ ...theme.typography.mobileBody, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
            No phrases match "{search}".
          </Text>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
