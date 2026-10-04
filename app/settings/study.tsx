// app/settings/study.tsx
// Study preferences — daily goal, weekly target, learning focus,
// pronunciation toggle. The customization surface.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
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
        <Text style={{ ...theme.typography.mobileEyebrow, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Daily goal</Text>
        {GOALS.map((g) => (
          <Pressable key={g.value} onPress={() => setGoal(g.value)} style={({ pressed }) => [{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: goal === g.value }}
            accessibilityLabel={`${g.label} — ${g.desc}`}>
            <MobileSurface padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>{g.label}</Text>
                  <Text style={{ ...theme.typography.mobileLedger, fontSize: 11, lineHeight: 15, color: colors.textMuted }}>{g.desc}</Text>
                </View>
                {goal === g.value ? <ConceptIcon name="check" size={22} color={colors.brand} /> : null}
              </View>
            </MobileSurface>
          </Pressable>
        ))}

        {/* Weekly target */}
        <Text style={{ ...theme.typography.mobileEyebrow, color: colors.textSecondary, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 }}>Weekly target</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {WEEKLY.map((d) => (
            <Pressable key={d} onPress={() => setWeekly(d)} style={({ pressed }) => ({
              flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2,
              borderColor: weekly === d ? colors.brand : colors.cardBorder,
              backgroundColor: weekly === d ? colors.brand + '12' : colors.cardAlt,
              alignItems: 'center', opacity: pressed ? 0.7 : 1,
            })}
              accessibilityRole="radio"
              accessibilityState={{ selected: weekly === d }}
              accessibilityLabel={`${d} days per week`}>
              <Text style={{ ...theme.typography.mobileFigure, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, color: weekly === d ? colors.brand : colors.textSecondary }}>{d}</Text>
              <Text style={{ ...theme.typography.mobileLedger, fontSize: 9, lineHeight: 12, color: colors.textMuted }}>days</Text>
            </Pressable>
          ))}
        </View>

        {/* Learning focus */}
        <Text style={{ ...theme.typography.mobileEyebrow, color: colors.textSecondary, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 }}>Learning focus</Text>
        <Text style={{ ...theme.typography.mobileBody, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginBottom: 8 }}>Select what to prioritize in your daily study sessions.</Text>
        {FOCUSES.map((f) => {
          const selected = focuses.includes(f.id);
          return (
            <Pressable key={f.id} onPress={() => toggleFocus(f.id)} style={({ pressed }) => [{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${f.label} — ${f.desc}`}>
              <MobileSurface padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ConceptIcon name={f.icon} size={24} color={selected ? colors.brand : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...theme.typography.mobileItemTitle, color: colors.text }}>{f.label}</Text>
                    <Text style={{ ...theme.typography.mobileBody, fontSize: 12, lineHeight: 17, color: colors.textMuted }}>{f.desc}</Text>
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
