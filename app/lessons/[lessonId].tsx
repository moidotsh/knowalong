// app/lessons/[lessonId].tsx
// Lesson player — steps through the learning items for a lesson one at a
// time. Each step shows the item with emoji + surface form + meaning +
// explanation + a "Got it" button to advance.

import React, { useState, useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToLessons } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { LEARNING_ITEMS, type LearningItem } from '../../utils/knowalong/fixtures/learningItems';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../../utils/knowalong/icons';

const LESSON_ITEMS: Record<string, readonly LearningItem[]> = {
  foundations: LEARNING_ITEMS.slice(0, 4),
  'daily-life': LEARNING_ITEMS.slice(4, 7),
  expressions: LEARNING_ITEMS.slice(7, 10),
};

export default function LessonPlayerScreen() {
  const { colors } = useAppTheme();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const items = LESSON_ITEMS[lessonId ?? ''] ?? [];
  const [stepIndex, setStepIndex] = useState(0);

  const item = items[stepIndex];
  const isComplete = stepIndex >= items.length;

  const handleContinue = useCallback(() => {
    setStepIndex((i) => i + 1);
  }, []);

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Lesson not found" onBack={safeGoBack} />
      </SafeAreaView>
    );
  }

  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileAtmosphere surface="analytics" />
        <MobileHeader title="Lesson complete!" onBack={safeGoBack} />
        <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <MobileSurface padding={24}>
            <ConceptIcon name="sparkles" size={40} color={colors.status.success} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {items.length} phrases mastered
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              You built usable Russian phrases from basic principles.
            </Text>
            {items.map((it, i) => (
              <Text key={i} style={{ fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 8 }}>
                {it.surfaceForm} — {it.meaning}
              </Text>
            ))}
          </MobileSurface>
        </ScrollView>
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={navigateToLessons}>More lessons</MobilePrimaryButton>
          <MobilePrimaryButton variant="secondary" onPress={() => { setStepIndex(0); }}>Review again</MobilePrimaryButton>
        </MobileActionFooter>
      </SafeAreaView>
    );
  }

  const progress = ((stepIndex + 1) / items.length) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={`Step ${stepIndex + 1} / ${items.length}`} eyebrow="Lesson" onBack={safeGoBack} />
      <View style={{ height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 }}>
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.brand, borderRadius: 2 }} />
      </View>
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <MobileSurface padding={24}>
          {ITEM_ICONS[item.id] ? (
            <View style={{ alignItems: 'center', marginBottom: 8 }}><ConceptIcon name={ITEM_ICONS[item.id] ?? 'star'} size={56} color={colors.brand} /></View>
          ) : null}
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
            {item.surfaceForm}
          </Text>
          <Text style={{ fontSize: 18, color: colors.textSecondary, textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
            {item.transliteration}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.brand, textAlign: 'center', marginTop: 16 }}>
            "{item.meaning}"
          </Text>

          {/* Word breakdown */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {item.words.map((w, i) => (
              <View key={i} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.cardBorder, backgroundColor: colors.cardAlt, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{w.gloss}</Text>
              </View>
            ))}
          </View>

          {/* Note */}
          {item.note ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
              {item.note}
            </Text>
          ) : null}

          {/* Context sentence */}
          {item.contextSentence ? (
            <View style={{ marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                {item.contextSentence.ru}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                {item.contextSentence.en}
              </Text>
            </View>
          ) : null}
        </MobileSurface>
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton variant="primary" onPress={handleContinue}>
          {stepIndex + 1 >= items.length ? 'Finish lesson' : 'Got it — next'}
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}
