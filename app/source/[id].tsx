// app/source/[id].tsx
// Source detail. Hero (title, artist, language, status). Readiness card.
// SegmentedControl tabs: Lyrics / Study / Words.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileSectionEyebrow,
  SegmentedControl,
  EmptyState,
} from '../../components/MobilePremium';
import type { Segment } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToSection, navigateToLemma, navigateToReview } from '../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
import {
  useLearningSource,
  useSourceSections,
  useSourceVocabulary,
  useSourceReadiness,
} from '../../hooks';
import type { ReadinessResult, LexicalLemma } from '@shared/types';

function ReadinessCard({ result }: { result: ReadinessResult | undefined }) {
  const { colors } = useAppTheme();
  if (!result || result.kind === 'not-assessed') {
    return (
      <MobileSurface padding={16}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Readiness</Text>
        <Text style={[styles.cardBody, { color: colors.textMuted, marginTop: 4 }]}>
          Not assessed yet. Review your source-derived cards to build a score.
        </Text>
      </MobileSurface>
    );
  }
  return (
    <MobileSurface padding={16}>
      <View style={styles.readinessHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Readiness</Text>
        <Text style={[styles.scoreText, { color: colors.brand }]}>{result.score}%</Text>
      </View>
      <View style={{ marginTop: 12, gap: 6 }}>
        {result.components.map((c) => (
          <View key={c.code} style={styles.componentRow}>
            <Text style={[styles.componentLabel, { color: colors.textSecondary }]}>
              {c.label}
            </Text>
            <View style={[styles.componentBarOuter, { backgroundColor: colors.cardBorder + '40' }]}>
              <View
                style={[
                  styles.componentBarInner,
                  { width: `${Math.round(c.raw * 100)}%`, backgroundColor: colors.brand },
                ]}
              />
            </View>          </View>
        ))}
      </View>
    </MobileSurface>
  );
}

export default function SourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const [tab, setTab] = useState(0);
  const sourceId = Array.isArray(id) ? id[0] : id;

  const { data: source } = useLearningSource(sourceId);
  const { data: sectionsData } = useSourceSections(sourceId);
  const { data: vocabulary } = useSourceVocabulary(sourceId);
  const { data: readiness } = useSourceReadiness(sourceId);

  const tabs: Segment<string>[] = [
    { label: 'Lyrics', value: 'lyrics' },
    { label: 'Study', value: 'study' },
    { label: 'Words', value: 'words' },
  ];

  const sections = sectionsData?.sections ?? [];
  const lines = sectionsData?.lines ?? [];

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title={source?.title ?? 'Source'} eyebrow="Source" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {source ? (
          <>
            <MobileSurface padding={16}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{source.title}</Text>
              {source.artist ? (
                <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
                  {source.artist}
                </Text>
              ) : null}
              <View style={styles.heroChipRow}>
                <View style={[styles.chip, { backgroundColor: colors.brandSoft }]}>
                  <Text style={[styles.chipText, { color: colors.brand }]}>
                    {source.targetLanguage.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.cardAlt }]}>
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                    {source.processingStatus}
                  </Text>
                </View>
              </View>
            </MobileSurface>

            <View style={{ height: 12 }} />
            <ReadinessCard result={readiness} />

            <View style={{ height: 16 }} />
            <SegmentedControl
              variant="tabs"
              segments={tabs}
              value={tabs[tab].value}
              onChange={(v: string) => {
                const idx = tabs.findIndex((t) => t.value === v);
                if (idx >= 0) setTab(idx);
              }}
            />

            <View style={{ height: 12 }} />

            {tab === 0 && (
              <View>
                <MobileSectionEyebrow>Exact source text</MobileSectionEyebrow>
                {sections.length > 0 ? (
                  sections.map((section) => {
                    const sectionLines = lines.filter((l) => l.sectionId === section.id);
                    return (
                      <View key={section.id} style={{ marginBottom: 12 }}>
                        <Pressable onPress={() => navigateToSection(sourceId!, section.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${section.sectionType} section`}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                          <MobileSurface padding={14}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                              {section.sectionType}
                              {section.label ? ` — ${section.label}` : ''}
                            </Text>
                            {sectionLines.map((line) => (
                              <Text
                                key={line.id}
                                style={[styles.lineText, { color: colors.text }]}
                              >
                                {line.rawText}
                              </Text>
                            ))}
                          </MobileSurface>
                        </Pressable>
                      </View>
                    );
                  })
                ) : (
                  <MobileSurface padding={14}>
                    {lines.map((line) => (
                      <Text key={line.id} style={[styles.lineText, { color: colors.text }]}>
                        {line.rawText}
                      </Text>
                    ))}
                  </MobileSurface>
                )}
              </View>
            )}

            {tab === 1 && (
              <View>
                <MobileSectionEyebrow>Study cards</MobileSectionEyebrow>
                <MobileSurface padding={14}>
                  <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                    Source-derived cards and generated-transfer practice will
                    appear here once analysis runs.
                  </Text>
                </MobileSurface>
              </View>
            )}

            {tab === 2 && (
              <View>
                <MobileSectionEyebrow>
                  Vocabulary ({vocabulary?.length ?? 0})
                </MobileSectionEyebrow>
                {(vocabulary?.length ?? 0) > 0 ? (
                  <View style={{ gap: 8 }}>
                    {vocabulary!.map((lemma: LexicalLemma) => (
                      <Pressable key={lemma.id} onPress={() => navigateToLemma(lemma.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${lemma.normalizedLemma}${lemma.primaryGloss ? ` — ${lemma.primaryGloss}` : ''}`}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                        <MobileSurface padding={12}>
                          <Text style={[styles.lemmaText, { color: colors.text }]}>
                            {lemma.normalizedLemma}
                          </Text>
                          {lemma.primaryGloss ? (
                            <Text style={[styles.lemmaGloss, { color: colors.textSecondary }]}>
                              {lemma.primaryGloss}
                            </Text>
                          ) : null}
                        </MobileSurface>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="No vocabulary yet"
                    message="Words extracted from this source will appear here."
                    compact
                  />
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={() => navigateToReview()}>
          Review due cards
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  heroTitle: {
    ...theme.typography.mobileItemTitle,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: theme.fonts.display,
    marginBottom: 4,
  },
  heroMeta: {
    ...theme.typography.mobileBody,
    marginBottom: 8,
  },
  heroChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    ...theme.typography.mobileEyebrow,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  cardTitle: {
    ...theme.typography.mobileItemTitle,
    fontSize: 15,
    lineHeight: 20,
  },
  cardBody: {
    ...theme.typography.mobileBody,
    fontSize: 13,
    lineHeight: 19,
  },
  scoreText: {
    ...theme.typography.mobileFigure,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  componentLabel: {
    ...theme.typography.mobileLedger,
    fontSize: 11,
    lineHeight: 15,
    width: 100,
  },
  componentBarOuter: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  componentBarInner: {
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    ...theme.typography.mobileEyebrow,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  lineText: {
    ...theme.typography.mobileBody,
    marginBottom: 2,
  },
  lemmaText: {
    ...theme.typography.mobileItemTitle,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fonts.display,
  },
  lemmaGloss: {
    ...theme.typography.mobileBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
