// app/source/[id]/section/[sectionId].tsx
// Section detail. Breadcrumb, section type/label, ordered lines, section
// readiness. Generated practice labelled separately.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileSectionEyebrow,
} from '../../../../components/MobilePremium';
import { useAppTheme } from '../../../../context';
import { safeGoBack, navigateToReview } from '../../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../../constants';
import { useSourceSections, useSectionReadiness } from '../../../../hooks';

export default function SectionDetailScreen() {
  const { id, sectionId } = useLocalSearchParams<{ id: string; sectionId: string }>();
  const { colors } = useAppTheme();
  const sourceId = Array.isArray(id) ? id[0] : id;
  const sectId = Array.isArray(sectionId) ? sectionId[0] : sectionId;

  const { data: sectionsData } = useSourceSections(sourceId);
  const { data: readiness } = useSectionReadiness(sourceId, sectId);

  const sections = sectionsData?.sections ?? [];
  const section = sections.find((s) => s.id === sectId);
  const lines = (sectionsData?.lines ?? []).filter((l) => l.sectionId === sectId);

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title={section?.label || section?.sectionType || 'Section'}
        eyebrow="Section"
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <MobileSurface padding={14}>
          <Text style={[styles.sectionType, { color: colors.textSecondary }]}>
            {section?.sectionType}
          </Text>
          {readiness?.kind === 'score' ? (
            <Text style={[styles.readinessScore, { color: colors.brand }]}>
              {readiness.score}% ready
            </Text>
          ) : (
            <Text style={[styles.readinessScore, { color: colors.textMuted }]}>
              Not assessed
            </Text>
          )}
        </MobileSurface>

        <View style={{ height: 16 }} />
        <MobileSectionEyebrow>Lines ({lines.length})</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          {lines.map((line, i) => (
            <View key={line.id} style={styles.lineItem}>
              <Text style={[styles.lineNumber, { color: colors.textMuted }]}>
                {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineText, { color: colors.text }]}>
                  {line.rawText}
                </Text>
                {line.translation ? (
                  <Text style={[styles.lineTranslation, { color: colors.textSecondary }]}>
                    {line.translation}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {lines.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No lines in this section.
            </Text>
          ) : null}
        </MobileSurface>

        <View style={{ height: 16 }} />
        <MobileSectionEyebrow>Generated practice</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.genText, { color: colors.textSecondary }]}>
            Generated practice cards for this section will appear here. They
            are always labelled as generated — never as source text.
          </Text>
        </MobileSurface>
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={() => navigateToReview()}>
          Start section review
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
  sectionType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  readinessScore: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  lineItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  lineNumber: {
    fontSize: 12,
    width: 20,
    paddingTop: 4,
  },
  lineText: {
    fontSize: 15,
    lineHeight: 22,
  },
  lineTranslation: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 13,
  },
  genText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
