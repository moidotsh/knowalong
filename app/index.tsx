// app/index.tsx
// KnowAlong home — minimal. One thing to do next + a clean grid of
// everything else. No card soup.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import {
  navigateToStudy, navigateToSettings, navigateToLessons,
  navigateToProgress, navigateToSongs, navigateToConversation,
} from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNER_STATS, NEXT_ACTION } from '../utils/knowalong/fixtures/learnerPath';
import { ITEM_ICONS } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

interface GridItem {
  icon: Parameters<typeof ConceptIcon>[0]['name'];
  label: string;
  onPress: () => void;
  color: string;
}

export default function HomeScreen() {
  const { colors } = useAppTheme();

  const grid: GridItem[] = [
    { icon: 'book', label: 'Lessons', onPress: navigateToLessons, color: colors.brand },
    { icon: 'sparkles', label: 'Conversation', onPress: navigateToConversation, color: colors.status.success },
    { icon: 'waves', label: 'Songs', onPress: navigateToSongs, color: colors.textSecondary },
    { icon: 'star', label: 'Progress', onPress: navigateToProgress, color: colors.status.warning },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title="Russian"
        eyebrow={`${LEARNER_STATS.streakDays}-day streak`}
        rightAction={
          <Pressable onPress={navigateToSettings} hitSlop={8}>
            <ConceptIcon name="user" size={22} color={colors.textSecondary} />
          </Pressable>
        }
      />

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>

        {/* The only thing that matters: continue */}
        <Pressable onPress={navigateToStudy}>
          <MobileSurface padding={28}>
            <View style={{ alignItems: 'center' }}>
              <ConceptIcon name={ITEM_ICONS['4'] ?? 'star'} size={48} color={colors.brand} />
              <Text style={{ fontSize: 36, fontWeight: '700', color: colors.text, marginTop: 12 }}>
                {NEXT_ACTION.label}
              </Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4 }}>
                {NEXT_ACTION.subtitle}
              </Text>
              <View style={{
                marginTop: 16, paddingVertical: 10, paddingHorizontal: 28, borderRadius: 24,
                backgroundColor: colors.brand,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textOnBrand }}>
                  Continue
                </Text>
              </View>
            </View>
          </MobileSurface>
        </Pressable>

        {/* Minimal grid — everything else */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {grid.map((item) => (
            <Pressable key={item.label} onPress={item.onPress} style={{ flex: 1, minWidth: '45%' }}>
              <MobileSurface padding={18}>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ConceptIcon name={item.icon} size={28} color={item.color} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.label}</Text>
                </View>
              </MobileSurface>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
