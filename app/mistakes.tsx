// app/mistakes.tsx
// Mistakes review — surfaces concepts the learner struggled with (wrong
// chips tapped). Uses the streak store's mistakeCodes array. Each mistake
// shown as a card with the concept's surface form + gloss + a "Review"
// button → /study.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToStudy } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';
import { useStreakStore } from '../stores/streakStore';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../utils/knowalong/icons';

export default function MistakesScreen() {
  const { colors } = useAppTheme();
  const mistakeCodes = useStreakStore((s) => s.mistakeCodes);
  const clearMistakes = useStreakStore((s) => s.clearMistakes);

  const mistakeItems = mistakeCodes
    .map((code) => LEARNING_ITEMS.find((i) => i.id === code))
    .filter((i): i is NonNullable<typeof i> => i !== undefined);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Mistakes review" eyebrow={`${mistakeItems.length} to review`} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>

        {mistakeItems.length === 0 ? (
          <MobileSurface padding={28}>
            <View style={{ alignItems: 'center' }}>
              <ConceptIcon name="check" size={48} color={colors.status.success} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12 }}>
                No mistakes!
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                You haven't made any mistakes yet. Study more and they'll appear here for review.
              </Text>
            </View>
          </MobileSurface>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
              These are the concepts you struggled with. Review them to lock them in.
            </Text>
            <View style={{ gap: 10 }}>
              {mistakeItems.map((item) => (
                <Pressable key={item.id} onPress={() => navigateToStudy()}>
                  <MobileSurface padding={16}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      {ITEM_ICONS[item.id] ? (
                        <ConceptIcon name={ITEM_ICONS[item.id]} size={28} color={colors.status.error} />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{item.surfaceForm}</Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{item.meaning}</Text>
                        {item.note ? (
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{item.note}</Text>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.status.error }}>Review →</Text>
                    </View>
                  </MobileSurface>
                </Pressable>
              ))}
            </View>
          </>
        )}

      </ScrollView>

      {mistakeItems.length > 0 ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => navigateToStudy()}>Study all mistakes</MobilePrimaryButton>
          <MobilePrimaryButton variant="ghost" onPress={clearMistakes}>Clear list</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
