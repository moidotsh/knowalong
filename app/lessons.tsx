// app/lessons.tsx
// Gradient lesson browser. Groups the learning items into themed lessons.
// Tapping a lesson → /lessons/[lessonId] (step-through player).

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToLesson } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import type { IconName } from '../utils/knowalong/icons';

interface LessonPreview {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  tierLabel: string;
  stepCount: number;
}

const LESSONS: readonly LessonPreview[] = [
  { id: 'foundations', icon: 'user', title: 'First Words', subtitle: 'я, я вижу, я знаю, я хочу', tierLabel: 'Tier 0', stepCount: 4 },
  { id: 'daily-life', icon: 'footprints', title: 'Daily Life', subtitle: 'я иду, я живу, мне нравится', tierLabel: 'Tier 1', stepCount: 3 },
  { id: 'expressions', icon: 'waves', title: 'Making Sentences', subtitle: 'я не знаю, я вижу море, я хочу чай', tierLabel: 'Tier 2', stepCount: 3 },
] as const;

export default function LessonsScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Gradient lessons" eyebrow="Learn Russian" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 12 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
          Build phrases step by step — each lesson introduces concepts you can use immediately.
        </Text>
        {LESSONS.map((lesson) => (
          <Pressable key={lesson.id} onPress={() => navigateToLesson(lesson.id)} style={{ borderRadius: 14 }}>
            <MobileSurface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <ConceptIcon name={lesson.icon} size={36} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{lesson.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{lesson.subtitle}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.brandSoft }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand }}>{lesson.tierLabel}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'center' }}>{lesson.stepCount} steps</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: colors.brand }}>→</Text>
              </View>
            </MobileSurface>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
