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
import { SCREEN_BODY_STYLE } from '../constants';
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

      {/* Category filter */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategory(cat)}
            style={{
              paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5,
              borderColor: category === cat ? colors.brand : colors.cardBorder,
              backgroundColor: category === cat ? colors.brand + '12' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: category === cat ? colors.brand : colors.textSecondary }}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 10 }}>
        {filtered.map((pattern) => {
          const isOpen = expanded === pattern.id;
          return (
            <Pressable key={pattern.id} onPress={() => setExpanded(isOpen ? null : pattern.id)}>
              <MobileSurface padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ConceptIcon name={pattern.icon} size={28} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{pattern.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{pattern.summary}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>{isOpen ? '−' : '+'}</Text>
                </View>

                {isOpen ? (
                  <View style={{ marginTop: 16 }}>
                    {/* Paradigm table */}
                    {pattern.paradigm ? (
                      <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                        {pattern.paradigm.map((cell, i) => (
                          <View key={i} style={{
                            flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12,
                            backgroundColor: i % 2 === 0 ? colors.cardAlt : 'transparent',
                            borderBottomWidth: i < pattern.paradigm!.length - 1 ? 1 : 0,
                            borderBottomColor: colors.cardBorder,
                          }}>
                            <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted }}>{cell.case}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 60, textAlign: 'center' }}>{cell.singular}</Text>
                            {cell.plural ? (
                              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, minWidth: 60, textAlign: 'center' }}>{cell.plural}</Text>
                            ) : <View style={{ minWidth: 60 }} />}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                      {pattern.explanation}
                    </Text>
                    <View style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: colors.brand + '10' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{pattern.example}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>{pattern.exampleTranslation}</Text>
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
