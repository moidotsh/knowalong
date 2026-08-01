// app/settings/study.tsx
// Study preferences — daily goal, weekly target, learning focus,
// pronunciation toggle. The customization surface.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';

const GOALS = [
  { value: 5, label: 'Casual', desc: '5 phrases · ~5 min/day' },
  { value: 10, label: 'Regular', desc: '10 phrases · ~10 min/day' },
  { value: 20, label: 'Serious', desc: '20 phrases · ~20 min/day' },
];

const WEEKLY = [3, 4, 5, 6, 7];

const FOCUSES = [
  { id: 'vocabulary', icon: 'book' as const, label: 'Vocabulary', desc: 'New words + phrases' },
  { id: 'grammar', icon: 'brain' as const, label: 'Grammar', desc: 'Cases, conjugations, patterns' },
  { id: 'conversation', icon: 'sparkles' as const, label: 'Conversation', desc: 'Q&A + active production' },
  { id: 'lyrics', icon: 'waves' as const, label: 'Lyrics', desc: 'Learn from songs' },
];

export default function StudySettingsScreen() {
  const { colors } = useAppTheme();
  const [goal, setGoal] = useState(10);
  const [weekly, setWeekly] = useState(5);
  const [focuses, setFocuses] = useState<string[]>(['vocabulary', 'conversation']);

  const toggleFocus = (id: string) => {
    setFocuses((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Study preferences" eyebrow="Settings" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        {/* Daily goal */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>Daily goal</Text>
        {GOALS.map((g) => (
          <Pressable key={g.value} onPress={() => setGoal(g.value)} style={{ marginBottom: 8 }}>
            <MobileSurface padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{g.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{g.desc}</Text>
                </View>
                {goal === g.value ? <ConceptIcon name="check" size={22} color={colors.brand} /> : null}
              </View>
            </MobileSurface>
          </Pressable>
        ))}

        {/* Weekly target */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 8 }}>Weekly target</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {WEEKLY.map((d) => (
            <Pressable key={d} onPress={() => setWeekly(d)} style={{
              flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2,
              borderColor: weekly === d ? colors.brand : colors.cardBorder,
              backgroundColor: weekly === d ? colors.brand + '12' : colors.cardAlt,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: weekly === d ? colors.brand : colors.textSecondary }}>{d}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>days</Text>
            </Pressable>
          ))}
        </View>

        {/* Learning focus */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 8 }}>Learning focus</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Select what to prioritize in your daily study sessions.</Text>
        {FOCUSES.map((f) => {
          const selected = focuses.includes(f.id);
          return (
            <Pressable key={f.id} onPress={() => toggleFocus(f.id)} style={{ marginBottom: 8 }}>
              <MobileSurface padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ConceptIcon name={f.icon} size={24} color={selected ? colors.brand : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{f.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{f.desc}</Text>
                  </View>
                  {selected ? <ConceptIcon name="check" size={20} color={colors.brand} /> : null}
                </View>
              </MobileSurface>
            </Pressable>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}
