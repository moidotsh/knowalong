// app/grammar.tsx
// Grammar explorer — reference cards for paradigm tables + pattern
// explanations. Not a lesson — the "I'm confused, let me look it up"
// surface. Organized by category (Cases, Verbs, Particles, Pronouns).

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { GRAMMAR_PATTERNS, type GrammarPattern } from '../utils/knowalong/fixtures/grammarPatterns';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

const CATEGORIES = ['All', 'Cases', 'Verbs', 'Particles', 'Pronouns'] as const;

export default function GrammarScreen() {
  const { colors } = useAppTheme();
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = category === 'All'
    ? GRAMMAR_PATTERNS
    : GRAMMAR_PATTERNS.filter((p) => p.category === category);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Grammar reference" eyebrow="Russian" onBack={safeGoBack} />

      {/* Category filter — mono tab chips */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${cat}`}
            accessibilityState={{ selected: category === cat }}
            style={({ pressed }) => ({
              paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5,
              borderColor: category === cat ? colors.brand : colors.cardBorder,
              backgroundColor: category === cat ? colors.brand + '12' : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 11, lineHeight: 14, color: category === cat ? colors.brand : colors.textSecondary }}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 10 }}>
        {filtered.map((pattern) => {
          const isOpen = expanded === pattern.id;
          return (
            <Pressable
              key={pattern.id}
              onPress={() => setExpanded(isOpen ? null : pattern.id)}
              accessibilityRole="button"
              accessibilityLabel={`${pattern.title}${isOpen ? ', expanded' : ', collapsed'}`}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <MobileSurface padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ConceptIcon name={pattern.icon} size={28} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 15, color: colors.text }}>{pattern.title}</Text>
                    <Text style={{ ...theme.typography.mobileLedger, fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 2 }}>{pattern.summary}</Text>
                  </View>
                  <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 18, color: colors.textMuted }}>{isOpen ? '−' : '+'}</Text>
                </View>

                {isOpen ? (
                  <View style={{ marginTop: 16 }}>
                    {/* Paradigm table — the ledger: mono case names, forms in
                        the body face, ruled rows */}
                    {pattern.paradigm ? (
                      <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                        {pattern.paradigm.map((cell, i) => (
                          <View key={i} style={{
                            flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12,
                            backgroundColor: i % 2 === 0 ? colors.cardAlt : 'transparent',
                            borderBottomWidth: i < pattern.paradigm!.length - 1 ? 1 : 0,
                            borderBottomColor: colors.cardBorder,
                          }}>
                            <Text style={{ flex: 1, ...theme.typography.mobileLedger, fontSize: 12, lineHeight: 16, color: colors.textMuted }}>{cell.case}</Text>
                            <Text style={{ ...theme.typography.mobileItemTitle, minWidth: 60, textAlign: 'center', color: colors.text }}>{cell.singular}</Text>
                            {cell.plural ? (
                              <Text style={{ ...theme.typography.mobileItemTitle, minWidth: 60, textAlign: 'center', color: colors.textSecondary }}>{cell.plural}</Text>
                            ) : <View style={{ minWidth: 60 }} />}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary }}>
                      {pattern.explanation}
                    </Text>
                    <View style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: colors.brand + '10' }}>
                      <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 16, lineHeight: 24, color: colors.text }}>{pattern.example}</Text>
                      <Text style={{ ...theme.typography.mobileLedger, fontSize: 12, lineHeight: 16, color: colors.textSecondary, marginTop: 4 }}>{pattern.exampleTranslation}</Text>
                    </View>
                  </View>
                ) : null}
              </MobileSurface>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
